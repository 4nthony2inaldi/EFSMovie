import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { tmdb, TMDBClient } from '@/lib/tmdb';

const MAX_USER_ADDED_MOVIES = 2;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auctionId = params.id;

  try {
    const body = await request.json();
    const { tmdb_id } = body;

    if (!tmdb_id || typeof tmdb_id !== 'number') {
      return NextResponse.json(
        { error: 'tmdb_id is required and must be a number' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get auction and verify it's open
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, league_id, for_month, for_year, status')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    if (auction.status !== 'open') {
      return NextResponse.json(
        { error: 'Auction is not open for bidding' },
        { status: 400 }
      );
    }

    // Get user's team in this league
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, league_id')
      .eq('user_id', user.id)
      .eq('league_id', auction.league_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'You are not a member of this league' },
        { status: 403 }
      );
    }

    // Use admin client for operations that need elevated privileges
    const adminSupabase = createAdminClient();

    // Count how many movies this team has already added to this auction
    const { count: addedCount } = await adminSupabase
      .from('auction_movies')
      .select('*', { count: 'exact', head: true })
      .eq('auction_id', auctionId)
      .eq('added_by_team_id', team.id);

    if ((addedCount || 0) >= MAX_USER_ADDED_MOVIES) {
      return NextResponse.json(
        { error: `You can only add up to ${MAX_USER_ADDED_MOVIES} movies per auction` },
        { status: 400 }
      );
    }

    // Check if movie is already in this auction
    const { data: existingAuctionMovie } = await adminSupabase
      .from('auction_movies')
      .select('id, movie:movies!inner(tmdb_id)')
      .eq('auction_id', auctionId);

    const movieAlreadyInAuction = existingAuctionMovie?.some(
      (am: any) => am.movie?.tmdb_id === tmdb_id
    );

    if (movieAlreadyInAuction) {
      return NextResponse.json(
        { error: 'This movie is already in the auction' },
        { status: 400 }
      );
    }

    // Check if movie exists in our database
    let { data: movie } = await adminSupabase
      .from('movies')
      .select('id, release_month, release_year')
      .eq('tmdb_id', tmdb_id)
      .single();

    // If movie doesn't exist, import it from TMDB
    if (!movie) {
      const tmdbMovie = await tmdb.getMovieDetails(tmdb_id);

      if (!tmdbMovie) {
        return NextResponse.json(
          { error: 'Movie not found on TMDB' },
          { status: 404 }
        );
      }

      // Parse release date
      const releaseDate = new Date(tmdbMovie.release_date);
      const releaseMonth = releaseDate.getMonth() + 1;
      const releaseYear = releaseDate.getFullYear();

      // Get IMDB ID
      const tmdbMovieAny = tmdbMovie as unknown as { external_ids?: { imdb_id?: string }; imdb_id?: string };
      const imdbId = tmdbMovieAny.external_ids?.imdb_id || tmdbMovieAny.imdb_id || null;

      // Insert movie into database
      const { data: newMovie, error: insertError } = await adminSupabase
        .from('movies')
        .insert({
          title: tmdbMovie.title,
          tmdb_id: tmdb_id,
          imdb_id: imdbId,
          release_date: tmdbMovie.release_date,
          release_month: releaseMonth,
          release_year: releaseYear,
          poster_url: TMDBClient.getPosterUrl(tmdbMovie.poster_path, 'w500'),
          backdrop_url: TMDBClient.getBackdropUrl(tmdbMovie.backdrop_path),
          genre: tmdbMovie.genres?.[0]?.name || 'Unknown',
          synopsis: tmdbMovie.overview,
          runtime_minutes: tmdbMovie.runtime,
          director: TMDBClient.getDirector(tmdbMovie.credits),
          cast_list: TMDBClient.getTopCast(tmdbMovie.credits, 10),
          trailer_url: TMDBClient.getTrailerUrl(tmdbMovie.videos),
          production_companies: TMDBClient.getProductionCompanies(tmdbMovie.production_companies),
        })
        .select('id, release_month, release_year')
        .single();

      if (insertError || !newMovie) {
        console.error('Failed to insert movie:', insertError);
        return NextResponse.json(
          { error: 'Failed to import movie' },
          { status: 500 }
        );
      }

      movie = newMovie;
    }

    // Verify movie is for the auction's month/year
    if (movie.release_month !== auction.for_month || movie.release_year !== auction.for_year) {
      return NextResponse.json(
        { error: `This movie is not scheduled for ${auction.for_month}/${auction.for_year}. It's scheduled for ${movie.release_month}/${movie.release_year}.` },
        { status: 400 }
      );
    }

    // Add movie to auction
    const { error: addError } = await adminSupabase
      .from('auction_movies')
      .insert({
        auction_id: auctionId,
        movie_id: movie.id,
        added_by_team_id: team.id,
      });

    if (addError) {
      console.error('Failed to add movie to auction:', addError);
      return NextResponse.json(
        { error: 'Failed to add movie to auction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Movie added to auction',
      movie_id: movie.id,
    });
  } catch (error) {
    console.error('Error adding movie to auction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
