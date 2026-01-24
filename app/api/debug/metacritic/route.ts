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

  // If debug mode, fetch Metacritic page directly and look for score content
  if (debug) {
    // Convert title to Metacritic slug
    const slug = title
      .toLowerCase()
      .replace(/[:']/g, '')
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const metacriticUrl = `https://www.metacritic.com/movie/${slug}/`;

    try {
      const response = await fetch(metacriticUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      const html = await response.text();

      // Extract JSON-LD blocks
      const jsonLdBlocks: unknown[] = [];
      const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      const jsonLdMatches = Array.from(html.matchAll(jsonLdRegex));
      for (const jsonLdMatch of jsonLdMatches) {
        try {
          const parsed = JSON.parse(jsonLdMatch[1].trim());
          jsonLdBlocks.push({
            hasAggregateRating: !!parsed.aggregateRating,
            aggregateRating: parsed.aggregateRating || null,
            type: parsed['@type'],
          });
        } catch (e) {
          jsonLdBlocks.push({ parseError: String(e), raw: jsonLdMatch[1].substring(0, 200) });
        }
      }

      // Find ratingValue patterns
      const ratingValueMatches: string[] = [];
      const rvRegex = /.{0,50}ratingValue.{0,50}/gi;
      let match;
      while ((match = rvRegex.exec(html)) !== null && ratingValueMatches.length < 10) {
        ratingValueMatches.push(match[0]);
      }

      // Find score patterns
      const scoreMatches: string[] = [];
      const scoreRegex = /.{0,30}score.{0,30}/gi;
      while ((match = scoreRegex.exec(html)) !== null && scoreMatches.length < 15) {
        scoreMatches.push(match[0]);
      }

      // Find metascore patterns
      const metascoreMatches: string[] = [];
      const msRegex = /.{0,50}metascore.{0,50}/gi;
      while ((match = msRegex.exec(html)) !== null && metascoreMatches.length < 10) {
        metascoreMatches.push(match[0]);
      }

      // Look for 2-digit numbers that could be scores (60-100 range typically)
      const numberMatches: string[] = [];
      const numRegex = />([6-9]\d|100)</g;
      while ((match = numRegex.exec(html)) !== null && numberMatches.length < 20) {
        numberMatches.push(match[0]);
      }

      results.metacriticDebug = {
        url: metacriticUrl,
        slug,
        status: response.status,
        htmlLength: html.length,
        jsonLdBlocks,
        ratingValueMatches,
        scoreMatches: scoreMatches.slice(0, 10),
        metascoreMatches,
        numberMatches,
      };
    } catch (error) {
      results.metacriticDebug = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
