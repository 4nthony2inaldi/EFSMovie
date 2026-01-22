import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Add a movie to the user's watchlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ movieId: string }> }
) {
  const { movieId } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if movie exists
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id')
      .eq('id', movieId)
      .single();

    if (movieError || !movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // Check if already interested
    const { data: existing } = await supabase
      .from('movie_interests')
      .select('id')
      .eq('user_id', user.id)
      .eq('movie_id', movieId)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Already in watchlist',
        interested: true
      });
    }

    // Add to watchlist
    const { error: insertError } = await supabase
      .from('movie_interests')
      .insert({
        user_id: user.id,
        movie_id: movieId,
      });

    if (insertError) {
      console.error('Failed to add to watchlist:', insertError);
      return NextResponse.json(
        { error: 'Failed to add to watchlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Added to watchlist',
      interested: true,
    });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Remove a movie from the user's watchlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ movieId: string }> }
) {
  const { movieId } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove from watchlist
    const { error: deleteError } = await supabase
      .from('movie_interests')
      .delete()
      .eq('user_id', user.id)
      .eq('movie_id', movieId);

    if (deleteError) {
      console.error('Failed to remove from watchlist:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove from watchlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from watchlist',
      interested: false,
    });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Check if a movie is in the user's watchlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movieId: string }> }
) {
  const { movieId } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: interest } = await supabase
      .from('movie_interests')
      .select('id')
      .eq('user_id', user.id)
      .eq('movie_id', movieId)
      .single();

    return NextResponse.json({
      interested: !!interest,
    });
  } catch (error) {
    console.error('Error checking watchlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
