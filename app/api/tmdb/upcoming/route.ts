import { NextRequest, NextResponse } from 'next/server';
import { tmdb, TMDBClient } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

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
    return NextResponse.json(
      { error: 'Failed to fetch movies from TMDB' },
      { status: 500 }
    );
  }
}
