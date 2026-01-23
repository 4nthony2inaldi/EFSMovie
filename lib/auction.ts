import { createAdminClient } from '@/lib/supabase/admin';

interface MovieAssignment {
  teamId: string;
  movieId: string;
  winningBid: number;
  priority: number | null;
}

/**
 * Resolve an auction by determining winners for each movie
 *
 * Rules:
 * - Each team can win at most N movies per auction (league's movies_per_auction setting, default 2)
 * - Highest bid wins
 * - Ties are broken by:
 *   1. Lower-ranked team wins (worse standing = wins)
 *   2. Random tiebreaker for true ties (e.g., at season start when all teams are at 0)
 * - Teams that submit no bids are auto-assigned up to N random unowned movies
 *   - Price per movie is the minimum of:
 *     - League's auto_assign_max_price setting (default $20)
 *     - League's auto_assign_budget_percent of team's budget ÷ movies assigned (default 5%)
 *     - Amount that leaves team with enough budget for minimum bids ($1 each) on remaining movies
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
  const league = auction.league;

  // Get league-specific movies per auction setting (default 2)
  const maxMoviesPerTeam = league?.movies_per_auction ?? 2;

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

  // 5. Track wins per team (max per league setting)
  const teamWinCount = new Map<string, number>();
  const teamAssignments = new Map<string, MovieAssignment[]>(); // Track assignments per team for priority swaps
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

  // Helper function to get effective priority (lower = higher priority)
  // If no priority set, use a high number based on amount (lower amounts = lower priority)
  const getEffectivePriority = (bid: { priority: number | null; amount: number }) => {
    if (bid.priority !== null && bid.priority > 0) {
      return bid.priority;
    }
    // Default: sort by amount descending, so higher amounts get lower (better) priority
    // Use 1000 as a base to ensure explicit priorities always come first
    return 1000 - bid.amount;
  };

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

    // Find first eligible bidder
    for (const bid of movieBids) {
      const currentWins = teamWinCount.get(bid.team_id) || 0;
      const currentTeamAssignments = teamAssignments.get(bid.team_id) || [];

      if (currentWins < maxMoviesPerTeam) {
        // Team has room, assign directly
        const assignment: MovieAssignment = {
          teamId: bid.team_id,
          movieId: movieId,
          winningBid: bid.amount,
          priority: bid.priority,
        };
        assignments.push(assignment);
        currentTeamAssignments.push(assignment);
        teamAssignments.set(bid.team_id, currentTeamAssignments);
        teamWinCount.set(bid.team_id, currentWins + 1);
        break;
      } else {
        // Team already has max movies - check if this one has higher priority
        const thisPriority = getEffectivePriority(bid);

        // Find the lowest priority (highest number) current assignment for this team
        let lowestPriorityIdx = -1;
        let lowestPriority = -Infinity;

        currentTeamAssignments.forEach((assignment, idx) => {
          const assignmentBid = (allBids || []).find(
            (b) => b.movie_id === assignment.movieId && b.team_id === bid.team_id
          );
          if (assignmentBid) {
            const assignmentPriority = getEffectivePriority(assignmentBid);
            if (assignmentPriority > lowestPriority) {
              lowestPriority = assignmentPriority;
              lowestPriorityIdx = idx;
            }
          }
        });

        // If this movie has better priority, swap it in
        if (thisPriority < lowestPriority && lowestPriorityIdx >= 0) {
          // Remove the old assignment from the main list
          const removedAssignment = currentTeamAssignments[lowestPriorityIdx];
          const mainIdx = assignments.findIndex(
            (a) => a.movieId === removedAssignment.movieId && a.teamId === removedAssignment.teamId
          );
          if (mainIdx >= 0) {
            assignments.splice(mainIdx, 1);
          }

          // Add the new assignment
          const newAssignment: MovieAssignment = {
            teamId: bid.team_id,
            movieId: movieId,
            winningBid: bid.amount,
            priority: bid.priority,
          };
          assignments.push(newAssignment);

          // Update team's assignments
          currentTeamAssignments.splice(lowestPriorityIdx, 1, newAssignment);
          teamAssignments.set(bid.team_id, currentTeamAssignments);

          // Note: The removed movie will be processed again in a later pass
          // to find its new owner (next highest bidder who's eligible)
          break;
        }
        // If this movie doesn't have higher priority, skip this bidder and try next
      }
    }
    // If no eligible bidder found, movie goes unowned
  }

  // 7b. Second pass: Reassign movies that were bumped due to priority swaps
  // Find movies in auctionMovies that aren't in assignments
  const assignedMovieIds = new Set(assignments.map((a) => a.movieId));
  const unassignedMovies = sortedMovies.filter((am) => !assignedMovieIds.has(am.movie_id));

  for (const auctionMovie of unassignedMovies) {
    const movieId = auctionMovie.movie_id;

    // Get all non-zero bids for this movie, excluding teams that already have max wins
    const movieBids = (allBids || [])
      .filter((b) => b.movie_id === movieId && b.amount > 0)
      .filter((b) => (teamWinCount.get(b.team_id) || 0) < maxMoviesPerTeam)
      .map((b) => ({
        ...b,
        standingsRank: standingsMap.get(b.team_id)?.rank || 999,
        tiebreaker: standingsMap.get(b.team_id)?.tiebreaker || Math.random(),
      }))
      .sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount;
        if (b.standingsRank !== a.standingsRank) return b.standingsRank - a.standingsRank;
        return b.tiebreaker - a.tiebreaker;
      });

    // Assign to first eligible bidder
    for (const bid of movieBids) {
      const currentWins = teamWinCount.get(bid.team_id) || 0;
      if (currentWins < maxMoviesPerTeam) {
        const assignment: MovieAssignment = {
          teamId: bid.team_id,
          movieId: movieId,
          winningBid: bid.amount,
          priority: bid.priority,
        };
        assignments.push(assignment);
        const currentTeamAssignments = teamAssignments.get(bid.team_id) || [];
        currentTeamAssignments.push(assignment);
        teamAssignments.set(bid.team_id, currentTeamAssignments);
        teamWinCount.set(bid.team_id, currentWins + 1);
        break;
      }
    }
  }

  // 8. Auto-assign movies to teams that didn't submit any bids
  // Get all teams in the league with their budgets
  const { data: allTeams } = await supabase
    .from('teams')
    .select('id, budget_remaining')
    .eq('league_id', leagueId);

  // Find teams that submitted zero bids for this auction
  const teamsWithBids = new Set((allBids || []).map((bid) => bid.team_id));
  const teamsWithNoBids = (allTeams || []).filter(
    (team) => !teamsWithBids.has(team.id)
  );

  // Find movies that weren't won (not in assignments)
  const wonMovieIds = new Set(assignments.map((a) => a.movieId));
  const unownedMovies = (auctionMovies || [])
    .filter((am) => !wonMovieIds.has(am.movie_id))
    .map((am) => am.movie_id);

  // Shuffle unowned movies for random assignment
  const shuffledUnownedMovies = [...unownedMovies].sort(() => Math.random() - 0.5);

  // Get league auto-assign settings (with defaults)
  const AUTO_ASSIGN_MAX_PRICE = league?.auto_assign_max_price ?? 20;
  const AUTO_ASSIGN_BUDGET_PERCENT = (league?.auto_assign_budget_percent ?? 5) / 100;
  const AUTO_ASSIGN_COUNT = maxMoviesPerTeam;
  const MINIMUM_BID = 1; // Minimum bid amount per movie

  // Calculate remaining auctions after this one
  const auctionMonth = auction.for_month;
  const auctionYear = auction.for_year;
  const seasonEndMonth = league?.season_end_month || 12;
  const seasonEndYear = league?.season_end_year || auctionYear;

  // Count remaining months (including season end month, excluding current auction month)
  let remainingAuctions = 0;
  let currentMonth = auctionMonth;
  let currentYear = auctionYear;
  while (currentYear < seasonEndYear || (currentYear === seasonEndYear && currentMonth < seasonEndMonth)) {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    remainingAuctions++;
  }

  // Auto-assign movies to each team that didn't bid
  for (const team of teamsWithNoBids) {
    const currentWins = teamWinCount.get(team.id) || 0;
    const moviesToAssign = Math.min(AUTO_ASSIGN_COUNT - currentWins, shuffledUnownedMovies.length);

    if (moviesToAssign <= 0) continue;

    const teamBudget = parseFloat(team.budget_remaining) || 0;

    // Calculate minimum reserve needed for remaining auctions
    // Each remaining auction needs at least $1 × 2 movies = $2 to make minimum bids
    const minimumReserve = remainingAuctions * AUTO_ASSIGN_COUNT * MINIMUM_BID;

    // Calculate available budget for auto-assign (budget minus reserve)
    const availableForAutoAssign = Math.max(0, teamBudget - minimumReserve);

    // Calculate price per movie:
    // - Combined budget percent / number of movies OR max price, whichever is less
    // - But also limited by available budget / number of movies
    const percentBasedPrice = (teamBudget * AUTO_ASSIGN_BUDGET_PERCENT) / moviesToAssign;
    const budgetLimitedPrice = availableForAutoAssign / moviesToAssign;

    // Take the minimum of all constraints
    let pricePerMovie = Math.min(
      AUTO_ASSIGN_MAX_PRICE,
      percentBasedPrice,
      budgetLimitedPrice
    );

    // Round to 2 decimal places
    pricePerMovie = Math.round(pricePerMovie * 100) / 100;

    // If price would be $0 or negative, still assign at $0 (free)
    pricePerMovie = Math.max(0, pricePerMovie);

    for (let i = 0; i < moviesToAssign; i++) {
      const movieId = shuffledUnownedMovies.shift();
      if (!movieId) break;

      assignments.push({
        teamId: team.id,
        movieId: movieId,
        winningBid: pricePerMovie,
        priority: null,
      });
      teamWinCount.set(team.id, (teamWinCount.get(team.id) || 0) + 1);
    }
  }

  // 9. Save assignments to team_movies
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

  // 10. Mark auction as resolved
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
