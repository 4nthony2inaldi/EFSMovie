import { NextRequest, NextResponse } from 'next/server';
import { TMDBClient } from '@/lib/tmdb';

// Force Node.js runtime (not Edge) and disable all caching
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Get API key at runtime - use NEXT_PUBLIC_ prefix to ensure Vercel passes it
function getApiKey(): string {
  return process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY || '';
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

  // Parse filter options
  const minVoteCount = searchParams.get('minVoteCount') ? parseInt(searchParams.get('minVoteCount')!) : undefined;
  const excludeDocumentaries = searchParams.get('excludeDocumentaries') === 'true';
  const minRuntime = searchParams.get('minRuntime') ? parseInt(searchParams.get('minRuntime')!) : undefined;

  // Get API key at runtime
  const apiKey = getApiKey();

  // Debug info
  const envKeys = Object.keys(process.env).filter(k =>
    k.includes('TMDB') || k.includes('tmdb') || k.includes('SUPABASE')
  );

  // Check if API key is configured
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'TMDB API is not configured. Please add TMDB_API_KEY to environment variables.',
        debug: {
          hasKey: false,
          keyLength: 0,
          nodeEnv: process.env.NODE_ENV,
          relevantEnvVars: envKeys,
          allEnvCount: Object.keys(process.env).length
        }
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      }
    );
  }

  try {
    // Create client with API key at request time
    const tmdb = new TMDBClient(apiKey);
    const movies = await tmdb.getMoviesByMonth(year, month, {
      minVoteCount,
      excludeDocumentaries,
      minRuntime,
    });

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

    return NextResponse.json(
      {
        year,
        month,
        movies: transformed,
      },
      {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      }
    );
  } catch (error) {
    console.error('TMDB API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch movies from TMDB: ${message}` },
      { status: 500 }
    );
  }
}
