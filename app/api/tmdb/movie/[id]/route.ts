import { NextRequest, NextResponse } from 'next/server';
import { tmdb, TMDBClient } from '@/lib/tmdb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const movieId = parseInt(params.id);

  if (isNaN(movieId)) {
    return NextResponse.json({ error: 'Invalid movie ID' }, { status: 400 });
  }

  try {
    const movie = await tmdb.getMovieDetails(movieId);

    // Get IMDB ID from external_ids if available
    const externalIds = (movie as Record<string, unknown>).external_ids as { imdb_id?: string } | undefined;
    const imdbId = externalIds?.imdb_id || movie.imdb_id || null;

    // Transform to our format
    const transformed = {
      tmdb_id: movie.id,
      imdb_id: imdbId,
      title: movie.title,
      synopsis: movie.overview,
      release_date: movie.release_date,
      poster_url: TMDBClient.getPosterUrl(movie.poster_path, 'w500'),
      backdrop_url: TMDBClient.getBackdropUrl(movie.backdrop_path),
      genre: movie.genres?.[0]?.name || 'Unknown',
      runtime_minutes: movie.runtime,
      director: TMDBClient.getDirector(movie.credits),
      cast_list: TMDBClient.getTopCast(movie.credits, 10),
      trailer_url: TMDBClient.getTrailerUrl(movie.videos),
      budget: movie.budget,
      revenue: movie.revenue,
      vote_average: movie.vote_average,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('TMDB API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie details from TMDB' },
      { status: 500 }
    );
  }
}
