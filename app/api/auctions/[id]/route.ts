import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: auctionId } = await params;

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is the commissioner of the league that owns this auction
  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .select('id, league:leagues!inner(id, commissioner_user_id)')
    .eq('id', auctionId)
    .single();

  if (auctionError || !auction) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
  }

  const league = auction.league as unknown as { id: string; commissioner_user_id: string };
  if (league.commissioner_user_id !== user.id) {
    return NextResponse.json({ error: 'Only the commissioner can delete auctions' }, { status: 403 });
  }

  // Use admin client to bypass RLS and handle cascade delete
  const adminSupabase = createAdminClient();

  try {
    // Get team_movies to refund budgets before deletion
    const { data: teamMovies } = await adminSupabase
      .from('team_movies')
      .select('team_id, winning_bid')
      .eq('auction_id', auctionId);

    // Refund budgets for any won movies
    for (const tm of teamMovies || []) {
      const { data: team } = await adminSupabase
        .from('teams')
        .select('budget_remaining')
        .eq('id', tm.team_id)
        .single();

      if (team) {
        await adminSupabase
          .from('teams')
          .update({ budget_remaining: Number(team.budget_remaining) + Number(tm.winning_bid) })
          .eq('id', tm.team_id);
      }
    }

    // Delete related records in order (foreign key constraints)
    // team_movies must be deleted first since it has a FK to auctions without cascade
    const { error: teamMoviesError } = await adminSupabase
      .from('team_movies')
      .delete()
      .eq('auction_id', auctionId);
    if (teamMoviesError) {
      throw new Error(`Failed to delete team movies: ${teamMoviesError.message}`);
    }

    const { error: bidsError } = await adminSupabase
      .from('bids')
      .delete()
      .eq('auction_id', auctionId);
    if (bidsError) {
      throw new Error(`Failed to delete bids: ${bidsError.message}`);
    }

    const { error: auctionMoviesError } = await adminSupabase
      .from('auction_movies')
      .delete()
      .eq('auction_id', auctionId);
    if (auctionMoviesError) {
      throw new Error(`Failed to delete auction movies: ${auctionMoviesError.message}`);
    }

    const { error: snapshotsError } = await adminSupabase
      .from('standings_snapshots')
      .delete()
      .eq('auction_id', auctionId);
    if (snapshotsError) {
      throw new Error(`Failed to delete standings snapshots: ${snapshotsError.message}`);
    }

    // Finally delete the auction itself
    const { error: deleteError } = await adminSupabase
      .from('auctions')
      .delete()
      .eq('id', auctionId);
    if (deleteError) {
      throw new Error(`Failed to delete auction: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting auction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete auction' },
      { status: 500 }
    );
  }
}
