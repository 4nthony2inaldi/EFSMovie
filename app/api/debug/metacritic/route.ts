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
  const debug = searchParams.get('debug') === 'true';

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

  // If debug mode, fetch IMDB page and look for metacritic-related content
  if (debug) {
    try {
      const response = await fetch(`https://www.imdb.com/title/${imdbId}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (response.ok) {
        const html = await response.text();

        // Find all occurrences of "metacritic" in the HTML (case-insensitive)
        const metacriticMatches: string[] = [];
        const regex = /.{0,100}metacritic.{0,100}/gi;
        let match;
        while ((match = regex.exec(html)) !== null && metacriticMatches.length < 10) {
          metacriticMatches.push(match[0]);
        }

        // Also look for "metascore"
        const metascoreMatches: string[] = [];
        const msRegex = /.{0,100}metascore.{0,100}/gi;
        while ((match = msRegex.exec(html)) !== null && metascoreMatches.length < 10) {
          metascoreMatches.push(match[0]);
        }

        // Look for score patterns with numbers
        const scorePatternMatches: string[] = [];
        const scoreRegex = /"score"\s*:\s*\d+/gi;
        while ((match = scoreRegex.exec(html)) !== null && scorePatternMatches.length < 10) {
          scorePatternMatches.push(match[0]);
        }

        results.imdbDebug = {
          status: response.status,
          htmlLength: html.length,
          metacriticMatches,
          metascoreMatches,
          scorePatternMatches,
        };
      } else {
        results.imdbDebug = { error: `HTTP ${response.status}` };
      }
    } catch (error) {
      results.imdbDebug = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
