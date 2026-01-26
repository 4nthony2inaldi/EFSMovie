import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { teamId, newBudget } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    if (typeof newBudget !== 'number' || newBudget < 0) {
      return NextResponse.json(
        { error: 'Valid budget amount is required' },
        { status: 400 }
      );
    }

    // Get the team to find its league
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, league_id, name, budget_remaining')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Verify the user is the commissioner of this team's league
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, commissioner_user_id')
      .eq('id', team.league_id)
      .single();

    if (leagueError || !league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }

    if (league.commissioner_user_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not the commissioner of this league' },
        { status: 403 }
      );
    }

    // Use admin client to update the budget (bypasses RLS)
    const adminSupabase = createAdminClient();

    const oldBudget = parseFloat(String(team.budget_remaining)) || 0;

    // Try to use the RPC function first
    const { error: rpcError } = await adminSupabase.rpc('set_team_budget', {
      p_team_id: teamId,
      p_new_budget: newBudget,
    });

    if (rpcError) {
      // Fallback to direct update if RPC doesn't exist
      console.log('RPC set_team_budget not found, using direct update');
      const { error: updateError } = await adminSupabase
        .from('teams')
        .update({ budget_remaining: newBudget, updated_at: new Date().toISOString() })
        .eq('id', teamId);

      if (updateError) {
        console.error('Error updating budget:', updateError);
        return NextResponse.json(
          { error: `Failed to update budget: ${updateError.message}` },
          { status: 500 }
        );
      }
    }

    console.log(`Budget updated for team ${team.name}: $${oldBudget} -> $${newBudget}`);

    return NextResponse.json({
      success: true,
      message: `Budget updated from $${oldBudget.toFixed(2)} to $${newBudget.toFixed(2)}`,
      oldBudget,
      newBudget,
    });
  } catch (error: any) {
    console.error('Error updating team budget:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update budget' },
      { status: 500 }
    );
  }
}
