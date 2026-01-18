import { createAdminClient } from '@/lib/supabase/admin';

interface MovieAssignment {
  teamId: string;
  movieId: string;
  winningBid: number;
}

/**
 * Resolve an auction by determining winners for each movie
 *
 * Rules:
 * - Each team can win at most 2 movies per auction
 * - Highest bid wins
 * - Ties are broken by:
 *   1. Lower-ranked team wins (worse standing = wins)
 *   2. Random tiebreaker for true ties (e.g., at season start when all teams are at 0)
 */
export async function resolveAuction(auctionId: string): Promise<MovieAssignment[]> {
  const supabase = createAdminClient();

  // 1. Get auction and league info
  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .select('*, league:leagues(*)')
    .eq('id', auctionId)
    .single();

  if (auctionError || !auction) {
    throw new Error(`Auction not found: ${auctionId}`);
  }

  const leagueId = auction.league_id;

  // 2. Get current standings for tie-breaking
  const { data: standings } = await supabase
    .rpc('get_league_standings', { p_league_id: leagueId });

  // Create standings map with random tiebreaker
  const standingsMap = new Map<string, { rank: number; tiebreaker: number }>();
  (standings || []).forEach((team: any, index: number) => {
    standingsMap.set(team.team_id, {
      rank: team.rank || index + 1,
      tiebreaker: Math.random(),
    });
  });

  // Save standings snapshot
  for (const team of standings || []) {
    const tiebreaker = standingsMap.get(team.team_id)?.tiebreaker || Math.random();
    await supabase.from('standings_snapshots').upsert({
      auction_id: auctionId,
      team_id: team.team_id,
      rank: team.rank,
      total_points: team.total_points,
      random_tiebreaker: tiebreaker,
    }, {
      onConflict: 'auction_id,team_id',
    });
  }

  // 3. Get all movies in this auction
  const { data: auctionMovies } = await supabase
    .from('auction_movies')
    .select('movie_id, movie:movies(*)')
    .eq('auction_id', auctionId);

  // 4. Get all bids for this auction
  const { data: allBids } = await supabase
    .from('bids')
    .select('*')
    .eq('auction_id', auctionId);

  // 5. Track wins per team (max 2 each)
  const teamWinCount = new Map<string, number>();
  const assignments: MovieAssignment[] = [];

  // 6. Sort movies by total bid value (highest interest first)
  const sortedMovies = (auctionMovies || []).sort((a, b) => {
    const aTotalBids = (allBids || [])
      .filter((bid) => bid.movie_id === a.movie_id)
      .reduce((sum, bid) => sum + bid.amount, 0);
    const bTotalBids = (allBids || [])
      .filter((bid) => bid.movie_id === b.movie_id)
      .reduce((sum, bid) => sum + bid.amount, 0);
    return bTotalBids - aTotalBids;
  });

  // 7. Process each movie
  for (const auctionMovie of sortedMovies) {
    const movieId = auctionMovie.movie_id;

    // Get all non-zero bids for this movie
    const movieBids = (allBids || [])
      .filter((b) => b.movie_id === movieId && b.amount > 0)
      .map((b) => ({
        ...b,
        standingsRank: standingsMap.get(b.team_id)?.rank || 999,
        tiebreaker: standingsMap.get(b.team_id)?.tiebreaker || Math.random(),
      }))
      .sort((a, b) => {
        // Higher bid wins
        if (b.amount !== a.amount) return b.amount - a.amount;
        // Lower-ranked team wins ties (higher rank number = worse = wins)
        if (b.standingsRank !== a.standingsRank) return b.standingsRank - a.standingsRank;
        // Random for true ties
        return b.tiebreaker - a.tiebreaker;
      });

    // Find first eligible bidder (hasn't won 2 movies yet)
    for (const bid of movieBids) {
      const currentWins = teamWinCount.get(bid.team_id) || 0;
      if (currentWins < 2) {
        // Assign movie to this team
        assignments.push({
          teamId: bid.team_id,
          movieId: movieId,
          winningBid: bid.amount,
        });
        teamWinCount.set(bid.team_id, currentWins + 1);
        break;
      }
    }
    // If no eligible bidder found, movie goes unowned
  }

  // 8. Save assignments to team_movies
  for (const assignment of assignments) {
    await supabase.from('team_movies').insert({
      team_id: assignment.teamId,
      movie_id: assignment.movieId,
      auction_id: auctionId,
      winning_bid: assignment.winningBid,
    });

    // Deduct from team's budget
    await supabase.rpc('deduct_budget', {
      p_team_id: assignment.teamId,
      p_amount: assignment.winningBid,
    });
  }

  // 9. Mark auction as resolved
  await supabase
    .from('auctions')
    .update({ status: 'resolved' })
    .eq('id', auctionId);

  return assignments;
}

/**
 * Check and update auction statuses
 */
export async function checkAuctionStatuses(): Promise<{
  opened: string[];
  closed: string[];
  resolved: string[];
}> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const result = {
    opened: [] as string[],
    closed: [] as string[],
    resolved: [] as string[],
  };

  // Open auctions that should be open
  const { data: toOpen } = await supabase
    .from('auctions')
    .select('id')
    .eq('status', 'upcoming')
    .lte('opens_at', now);

  for (const auction of toOpen || []) {
    await supabase
      .from('auctions')
      .update({ status: 'open' })
      .eq('id', auction.id);
    result.opened.push(auction.id);
  }

  // Close auctions that should be closed
  const { data: toClose } = await supabase
    .from('auctions')
    .select('id')
    .eq('status', 'open')
    .lte('closes_at', now);

  for (const auction of toClose || []) {
    await supabase
      .from('auctions')
      .update({ status: 'closed' })
      .eq('id', auction.id);
    result.closed.push(auction.id);

    // Auto-resolve
    try {
      await resolveAuction(auction.id);
      result.resolved.push(auction.id);
    } catch (error) {
      console.error(`Failed to resolve auction ${auction.id}:`, error);
    }
  }

  return result;
}
