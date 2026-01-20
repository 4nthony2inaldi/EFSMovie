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
    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Get the team to find its league and user
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, league_id, name, user_id')
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

    // Prevent commissioner from deleting their own team via this endpoint
    if (team.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove your own team' },
        { status: 400 }
      );
    }

    // Use admin client to delete the team and user (bypasses RLS)
    const adminSupabase = createAdminClient();

    // First delete the team record
    const { error: deleteError } = await adminSupabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) {
      console.error('Error deleting team:', deleteError);
      return NextResponse.json(
        { error: `Failed to remove team: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Also delete the user from Supabase auth so they can sign up again with the same email
    if (team.user_id) {
      const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(team.user_id);
      if (deleteUserError) {
        // Log but don't fail - team was already deleted
        console.error('Error deleting user from auth:', deleteUserError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Team "${team.name}" has been removed`,
    });
  } catch (error: any) {
    console.error('Error removing team:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove team' },
      { status: 500 }
    );
  }
}
