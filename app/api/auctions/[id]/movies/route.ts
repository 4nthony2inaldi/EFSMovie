import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auctionId = params.id;

  try {
    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: missing service role key' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { movie_ids } = body;

    console.log('Updating auction movies for auction:', auctionId, 'with', movie_ids?.length, 'movies');

    if (!Array.isArray(movie_ids)) {
      return NextResponse.json(
        { error: 'movie_ids must be an array' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get auction and verify user is commissioner of the league
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, league_id, league:leagues!inner(commissioner_user_id)')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    const league = auction.league as unknown as { commissioner_user_id: string };
    if (league.commissioner_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the commissioner can manage auction movies' },
        { status: 403 }
      );
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Remove existing commissioner-added movies (those with null added_by_team_id)
    console.log('Deleting existing commissioner-added movies for auction:', auctionId);
    const { error: deleteError } = await adminSupabase
      .from('auction_movies')
      .delete()
      .eq('auction_id', auctionId)
      .is('added_by_team_id', null);

    if (deleteError) {
      console.error('Failed to delete existing auction movies:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete existing movies: ${deleteError.message}` },
        { status: 500 }
      );
    }
    console.log('Successfully deleted existing commissioner-added movies');

    // Add new movies (if any). Skip rows that already exist for this auction
    // via the unique (auction_id, movie_id) constraint — those are team-added
    // rows we left in place above, and re-inserting them as commissioner-added
    // would violate the constraint.
    if (movie_ids.length > 0) {
      console.log('Upserting', movie_ids.length, 'movies for auction:', auctionId);
      const auctionMovies = movie_ids.map((movieId: string) => ({
        auction_id: auctionId,
        movie_id: movieId,
        added_by_team_id: null,
      }));

      const { error: insertError } = await adminSupabase
        .from('auction_movies')
        .upsert(auctionMovies, { onConflict: 'auction_id,movie_id', ignoreDuplicates: true });

      if (insertError) {
        console.error('Failed to insert auction movies:', insertError);
        return NextResponse.json(
          { error: `Failed to add movies: ${insertError.message}` },
          { status: 500 }
        );
      }
      console.log('Successfully upserted movies for auction:', auctionId);
    }

    return NextResponse.json({
      success: true,
      message: `${movie_ids.length} movies set for auction`,
      count: movie_ids.length,
    });
  } catch (error) {
    console.error('Error managing auction movies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch auction movies
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auctionId = params.id;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: auctionMovies, error } = await supabase
      .from('auction_movies')
      .select('movie_id, added_by_team_id')
      .eq('auction_id', auctionId);

    if (error) {
      console.error('Failed to fetch auction movies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch auction movies' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      movie_ids: auctionMovies?.map(am => am.movie_id) || [],
      commissioner_added: auctionMovies?.filter(am => !am.added_by_team_id).map(am => am.movie_id) || [],
      user_added: auctionMovies?.filter(am => am.added_by_team_id).map(am => am.movie_id) || [],
    });
  } catch (error) {
    console.error('Error fetching auction movies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
