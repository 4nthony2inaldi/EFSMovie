import { NextRequest, NextResponse } from 'next/server';
import { getMovieRatings } from '@/lib/api/omdb';
import { scrapeMetacriticScore } from '@/lib/boxofficemojo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imdbId = searchParams.get('imdbId') || 'tt32141377'; // Default to Bone Temple
  const title = searchParams.get('title') || '28 Years Later: The Bone Temple';
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : 2026;

  const results: Record<string, unknown> = {
    imdbId,
    title,
    year,
    omdb: null,
    omdbError: null,
    scrape: null,
    scrapeError: null,
    envCheck: {
      hasOmdbKey: !!process.env.OMDB_API_KEY,
      keyPrefix: process.env.OMDB_API_KEY?.substring(0, 4) + '...',
    },
  };

  // Test OMDB API
  try {
    const omdbData = await getMovieRatings(imdbId);
    results.omdb = omdbData;
  } catch (error) {
    results.omdbError = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test IMDB scraper
  try {
    const scraped = await scrapeMetacriticScore(imdbId, title, year);
    results.scrape = scraped;
  } catch (error) {
    results.scrapeError = error instanceof Error ? error.message : 'Unknown error';
  }

  return NextResponse.json(results, { status: 200 });
}
