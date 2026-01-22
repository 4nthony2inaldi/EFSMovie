import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get all movie IDs in the user's watchlist (for efficient checking)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: interests, error } = await supabase
      .from('movie_interests')
      .select('movie_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching watchlist:', error);
      return NextResponse.json(
        { error: 'Failed to fetch watchlist' },
        { status: 500 }
      );
    }

    const movieIds = interests?.map(i => i.movie_id) || [];

    return NextResponse.json({
      movieIds,
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
