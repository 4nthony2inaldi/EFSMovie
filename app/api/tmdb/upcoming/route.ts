import { NextRequest, NextResponse } from 'next/server';
import { tmdb, TMDBClient } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

  // Debug: check env var
  const apiKey = process.env.TMDB_API_KEY;
  const hasKey = !!apiKey;
  const keyLength = apiKey?.length || 0;

  // Check if API key is configured
  if (!apiKey) {
    console.error('TMDB_API_KEY environment variable is not set');
    return NextResponse.json(
      {
        error: 'TMDB API is not configured. Please add TMDB_API_KEY to environment variables.',
        debug: { hasKey, keyLength, nodeEnv: process.env.NODE_ENV }
      },
      { status: 500 }
    );
  }

  try {
    const movies = await tmdb.getMoviesByMonth(year, month);

    // Transform to a simpler format
    const transformed = movies.map((movie) => ({
      tmdb_id: movie.id,
      title: movie.title,
      overview: movie.overview,
      release_date: movie.release_date,
      poster_url: TMDBClient.getPosterUrl(movie.poster_path),
      backdrop_url: TMDBClient.getBackdropUrl(movie.backdrop_path),
      genre: TMDBClient.getPrimaryGenre(movie.genre_ids),
      popularity: movie.popularity,
      vote_average: movie.vote_average,
    }));

    return NextResponse.json({
      year,
      month,
      movies: transformed,
    });
  } catch (error) {
    console.error('TMDB API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch movies from TMDB: ${message}` },
      { status: 500 }
    );
  }
}
