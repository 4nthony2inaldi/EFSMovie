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
    const { teamId, movieId } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    if (!movieId) {
      return NextResponse.json(
        { error: 'Movie ID is required' },
        { status: 400 }
      );
    }

    // Get the team to find its league
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, league_id, name')
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

    // Use admin client (bypasses RLS)
    const adminSupabase = createAdminClient();

    // Get movie title for the response message
    const { data: movie } = await adminSupabase
      .from('movies')
      .select('title')
      .eq('id', movieId)
      .single();

    // Remove the movie from the team
    const { error: deleteError } = await adminSupabase
      .from('team_movies')
      .delete()
      .eq('team_id', teamId)
      .eq('movie_id', movieId);

    if (deleteError) {
      console.error('Error removing movie from team:', deleteError);
      return NextResponse.json(
        { error: `Failed to remove movie: ${deleteError.message}` },
        { status: 500 }
      );
    }

    const movieTitle = movie?.title || 'Movie';
    console.log(`Movie "${movieTitle}" removed from team ${team.name}`);

    return NextResponse.json({
      success: true,
      message: `"${movieTitle}" removed from ${team.name}`,
    });
  } catch (error: any) {
    console.error('Error removing movie from team:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove movie from team' },
      { status: 500 }
    );
  }
}
