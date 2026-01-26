import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const auctionId = params.id;
    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get auction with current status and verify commissioner
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
      return NextResponse.json({ error: 'Only the commissioner can update auctions' }, { status: 403 });
    }

    const oldStatus = auction.status;

    // If changing FROM resolved to another status, we need to clean up assignments
    if (oldStatus === 'resolved' && newStatus !== 'resolved') {
      const adminSupabase = createAdminClient();

      // Get team_movies to refund budgets
      const { data: teamMovies, error: teamMoviesQueryError } = await adminSupabase
        .from('team_movies')
        .select('team_id, winning_bid')
        .eq('auction_id', auctionId);

      if (teamMoviesQueryError) {
        console.error('Error querying team_movies:', teamMoviesQueryError);
        return NextResponse.json({ error: `Failed to query team movies: ${teamMoviesQueryError.message}` }, { status: 500 });
      }

      console.log(`Unresolving auction ${auctionId}: found ${teamMovies?.length || 0} team_movies to refund`);

      // Refund budgets for won movies using raw SQL to avoid type issues
      for (const tm of teamMovies || []) {
        const winningBid = parseFloat(String(tm.winning_bid)) || 0;
        if (winningBid <= 0) {
          console.log(`Skipping refund for team ${tm.team_id}: winning_bid is ${tm.winning_bid}`);
          continue;
        }

        // Use RPC or raw increment to avoid float/string issues
        const { error: updateError } = await adminSupabase.rpc('refund_budget', {
          p_team_id: tm.team_id,
          p_amount: winningBid,
        });

        if (updateError) {
          // Fallback to direct update if RPC doesn't exist
          console.log('RPC refund_budget not found, using direct update');
          const { data: team, error: teamError } = await adminSupabase
            .from('teams')
            .select('budget_remaining')
            .eq('id', tm.team_id)
            .single();

          if (teamError) {
            console.error('Error fetching team for refund:', teamError);
            continue;
          }

          if (team) {
            const currentBudget = parseFloat(String(team.budget_remaining)) || 0;
            const newBudget = currentBudget + winningBid;
            console.log(`Refunding team ${tm.team_id}: ${currentBudget} + ${winningBid} = ${newBudget}`);

            const { error: directUpdateError } = await adminSupabase
              .from('teams')
              .update({ budget_remaining: newBudget })
              .eq('id', tm.team_id);

            if (directUpdateError) {
              console.error('Error refunding budget:', directUpdateError);
            }
          }
        } else {
          console.log(`Refunded ${winningBid} to team ${tm.team_id} via RPC`);
        }
      }

      // Delete team_movies for this auction
      const { error: teamMoviesError } = await adminSupabase
        .from('team_movies')
        .delete()
        .eq('auction_id', auctionId);

      if (teamMoviesError) {
        console.error('Failed to delete team_movies:', teamMoviesError);
        return NextResponse.json({ error: `Failed to delete team movies: ${teamMoviesError.message}` }, { status: 500 });
      }

      // Delete standings_snapshots for this auction
      const { error: snapshotsError } = await adminSupabase
        .from('standings_snapshots')
        .delete()
        .eq('auction_id', auctionId);

      if (snapshotsError) {
        console.error('Failed to delete standings_snapshots:', snapshotsError);
        // Non-fatal, continue
      }

      console.log(`Auction ${auctionId} unresolved: refunded budgets and deleted assignments`);
    }

    // Update the auction status
    const { error: updateError } = await supabase
      .from('auctions')
      .update({ status: newStatus })
      .eq('id', auctionId);

    if (updateError) {
      return NextResponse.json({ error: `Failed to update status: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      oldStatus,
      newStatus,
      unresolved: oldStatus === 'resolved' && newStatus !== 'resolved'
    });
  } catch (error) {
    console.error('Unexpected error updating auction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json({ error: 'Server configuration error: missing service role key' }, { status: 500 });
    }

    const supabase = await createClient();
    const auctionId = params.id;

    console.log('Attempting to delete auction:', auctionId);

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
      console.error('Auction lookup error:', auctionError);
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    const league = auction.league as unknown as { id: string; commissioner_user_id: string };
    if (league.commissioner_user_id !== user.id) {
      return NextResponse.json({ error: 'Only the commissioner can delete auctions' }, { status: 403 });
    }

    // Use admin client to bypass RLS and handle cascade delete
    const adminSupabase = createAdminClient();

    // Get team_movies to refund budgets before deletion
    const { data: teamMovies, error: teamMoviesQueryError } = await adminSupabase
      .from('team_movies')
      .select('team_id, winning_bid')
      .eq('auction_id', auctionId);

    if (teamMoviesQueryError) {
      console.error('Error querying team_movies:', teamMoviesQueryError);
      return NextResponse.json({ error: `Failed to query team movies: ${teamMoviesQueryError.message}` }, { status: 500 });
    }

    console.log('Found team_movies to refund:', teamMovies?.length || 0);

    // Refund budgets for any won movies
    for (const tm of teamMovies || []) {
      const { data: team, error: teamError } = await adminSupabase
        .from('teams')
        .select('budget_remaining')
        .eq('id', tm.team_id)
        .single();

      if (teamError) {
        console.error('Error fetching team for refund:', teamError);
        continue;
      }

      if (team) {
        const { error: updateError } = await adminSupabase
          .from('teams')
          .update({ budget_remaining: Number(team.budget_remaining) + Number(tm.winning_bid) })
          .eq('id', tm.team_id);

        if (updateError) {
          console.error('Error refunding budget:', updateError);
        }
      }
    }

    // Delete related records in order (foreign key constraints)
    // team_movies must be deleted first since it has a FK to auctions without cascade
    console.log('Deleting team_movies...');
    const { error: teamMoviesError } = await adminSupabase
      .from('team_movies')
      .delete()
      .eq('auction_id', auctionId);
    if (teamMoviesError) {
      console.error('Failed to delete team_movies:', teamMoviesError);
      return NextResponse.json({ error: `Failed to delete team movies: ${teamMoviesError.message}` }, { status: 500 });
    }

    console.log('Deleting bids...');
    const { error: bidsError } = await adminSupabase
      .from('bids')
      .delete()
      .eq('auction_id', auctionId);
    if (bidsError) {
      console.error('Failed to delete bids:', bidsError);
      return NextResponse.json({ error: `Failed to delete bids: ${bidsError.message}` }, { status: 500 });
    }

    console.log('Deleting auction_movies...');
    const { error: auctionMoviesError } = await adminSupabase
      .from('auction_movies')
      .delete()
      .eq('auction_id', auctionId);
    if (auctionMoviesError) {
      console.error('Failed to delete auction_movies:', auctionMoviesError);
      return NextResponse.json({ error: `Failed to delete auction movies: ${auctionMoviesError.message}` }, { status: 500 });
    }

    console.log('Deleting standings_snapshots...');
    const { error: snapshotsError } = await adminSupabase
      .from('standings_snapshots')
      .delete()
      .eq('auction_id', auctionId);
    if (snapshotsError) {
      console.error('Failed to delete standings_snapshots:', snapshotsError);
      return NextResponse.json({ error: `Failed to delete standings snapshots: ${snapshotsError.message}` }, { status: 500 });
    }

    // Finally delete the auction itself
    console.log('Deleting auction...');
    const { error: deleteError } = await adminSupabase
      .from('auctions')
      .delete()
      .eq('id', auctionId);
    if (deleteError) {
      console.error('Failed to delete auction:', deleteError);
      return NextResponse.json({ error: `Failed to delete auction record: ${deleteError.message}` }, { status: 500 });
    }

    console.log('Auction deleted successfully:', auctionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error deleting auction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}
