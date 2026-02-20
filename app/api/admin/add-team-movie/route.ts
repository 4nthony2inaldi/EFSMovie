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
    const { teamId, movieId, winningBid = 0 } = await request.json();

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

    // Verify the movie exists
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id, title')
      .eq('id', movieId)
      .single();

    if (movieError || !movie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }

    // Use admin client to insert (bypasses RLS)
    const adminSupabase = createAdminClient();

    // Check if team already owns this movie
    const { data: existing } = await adminSupabase
      .from('team_movies')
      .select('id')
      .eq('team_id', teamId)
      .eq('movie_id', movieId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `${team.name} already owns "${movie.title}"` },
        { status: 400 }
      );
    }

    // Add the movie to the team
    const { error: insertError } = await adminSupabase
      .from('team_movies')
      .insert({
        team_id: teamId,
        movie_id: movieId,
        auction_id: null, // Manual addition, no auction
        winning_bid: winningBid,
      });

    if (insertError) {
      console.error('Error adding movie to team:', insertError);
      return NextResponse.json(
        { error: `Failed to add movie: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log(`Movie "${movie.title}" added to team ${team.name} (bid: $${winningBid})`);

    return NextResponse.json({
      success: true,
      message: `"${movie.title}" added to ${team.name}`,
    });
  } catch (error: any) {
    console.error('Error adding movie to team:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add movie to team' },
      { status: 500 }
    );
  }
}
