import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { teamId, targetLeagueId } = await request.json();

    if (!teamId || !targetLeagueId) {
      return NextResponse.json(
        { error: 'Team ID and target league ID are required' },
        { status: 400 }
      );
    }

    // Verify team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, league_id, user_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Verify target league exists
    const { data: targetLeague, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('id', targetLeagueId)
      .single();

    if (leagueError || !targetLeague) {
      return NextResponse.json(
        { error: 'Target league not found' },
        { status: 404 }
      );
    }

    // Check if team is already in target league
    if (team.league_id === targetLeagueId) {
      return NextResponse.json(
        { error: 'Team is already in this league' },
        { status: 400 }
      );
    }

    // Check if user already has a team in the target league
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('user_id', team.user_id)
      .eq('league_id', targetLeagueId)
      .single();

    if (existingTeam) {
      return NextResponse.json(
        { error: 'This user already has a team in the target league' },
        { status: 400 }
      );
    }

    // Move the team to the new league
    const { error: updateError } = await supabase
      .from('teams')
      .update({ league_id: targetLeagueId })
      .eq('id', teamId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Team "${team.name}" moved to league "${targetLeague.name}"`,
    });
  } catch (error: any) {
    console.error('Error moving team:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to move team' },
      { status: 500 }
    );
  }
}
