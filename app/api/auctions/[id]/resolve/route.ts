import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuction } from '@/lib/auction';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const auctionId = params.id;

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is the commissioner of the league that owns this auction
  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .select('id, status, league:leagues!inner(id, commissioner_user_id)')
    .eq('id', auctionId)
    .single();

  if (auctionError || !auction) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
  }

  const league = auction.league as unknown as { id: string; commissioner_user_id: string };
  if (league.commissioner_user_id !== user.id) {
    return NextResponse.json({ error: 'Only the commissioner can resolve auctions' }, { status: 403 });
  }

  // If already resolved, allow re-resolution by clearing old assignments
  if (auction.status === 'resolved') {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    // Get old assignments to refund budgets
    const { data: oldAssignments } = await adminSupabase
      .from('team_movies')
      .select('team_id, winning_bid')
      .eq('auction_id', auctionId);

    // Refund budgets (add back the winning bid amount)
    for (const assignment of oldAssignments || []) {
      const { data: team } = await adminSupabase
        .from('teams')
        .select('budget_remaining')
        .eq('id', assignment.team_id)
        .single();

      if (team) {
        await adminSupabase
          .from('teams')
          .update({ budget_remaining: Number(team.budget_remaining) + Number(assignment.winning_bid) })
          .eq('id', assignment.team_id);
      }
    }

    // Clear old assignments
    await adminSupabase
      .from('team_movies')
      .delete()
      .eq('auction_id', auctionId);

    // Clear old standings snapshot
    await adminSupabase
      .from('standings_snapshots')
      .delete()
      .eq('auction_id', auctionId);
  }

  try {
    const assignments = await resolveAuction(auctionId);

    return NextResponse.json({
      success: true,
      assignments: assignments.length,
      message: `Assigned ${assignments.length} movies to teams`,
    });
  } catch (error: unknown) {
    console.error('Error resolving auction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve auction' },
      { status: 500 }
    );
  }
}
