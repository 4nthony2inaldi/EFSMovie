import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeBoxOfficeMojoBrowser } from '@/lib/scraper-browser';
import { scrapeMetacriticScore } from '@/lib/boxofficemojo';
import { getMovieRatings } from '@/lib/api/omdb';
import { tmdb } from '@/lib/tmdb';
import type { ReleaseType } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for Pro plan, adjust based on your plan

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

function determineReleaseType(
  theaterCount: number | null | undefined,
  widestRelease: number | null | undefined,
  hasTheatricalData: boolean
): ReleaseType {
  const maxTheaters = Math.max(theaterCount || 0, widestRelease || 0);

  if (maxTheaters >= 2000) {
    return 'wide';
  } else if (maxTheaters > 0) {
    return 'limited';
  } else if (!hasTheatricalData) {
    return 'streaming';
  }
  return 'unknown';
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Get movies released in the last 90 days that need data refresh
    // These are most likely to have new/updated box office data
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, tmdb_id, release_year, release_month, release_date, imdb_id')
      .gte('release_date', ninetyDaysAgo.toISOString().split('T')[0])
      .lte('release_date', today.toISOString().split('T')[0])
      .order('release_date', { ascending: false })
      .limit(20); // Limit to 20 movies per run to stay within execution limits

    if (error) {
      console.error('Failed to fetch movies:', error);
      return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
    }

    if (!movies || movies.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No movies to refresh',
        updated: 0,
      });
    }

    const results = {
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
      movies: [] as string[],
    };

    for (const movie of movies) {
      try {
        let imdbId = movie.imdb_id;

        // Get IMDB ID from TMDB if we don't have it
        if (!imdbId && movie.tmdb_id) {
          try {
            const details = await tmdb.getMovieDetails(movie.tmdb_id);
            const detailsAny = details as unknown as {
              external_ids?: { imdb_id?: string };
              imdb_id?: string;
            };
            imdbId = detailsAny.external_ids?.imdb_id || detailsAny.imdb_id || null;

            // Save the IMDB ID for future use
            if (imdbId) {
              await supabase
                .from('movies')
                .update({ imdb_id: imdbId })
                .eq('id', movie.id);
            }
          } catch (e) {
            console.error(`Failed to get IMDB ID for ${movie.title}:`, e);
          }
        }

        if (!imdbId) {
          results.skipped++;
          continue;
        }

        // Scrape box office and theater data
        const boxOfficeData = await scrapeBoxOfficeMojoBrowser(
          imdbId,
          movie.title,
          movie.release_year,
          movie.release_date,
          movie.release_month
        );

        // Get Metacritic score - try OMDB first, fall back to IMDB scrape
        let metacriticScore: number | null = null;
        try {
          const ratings = await getMovieRatings(imdbId);
          metacriticScore = ratings.metacritic;
        } catch (e) {
          // OMDB failed, will try IMDB scrape below
        }

        if (!metacriticScore) {
          metacriticScore = await scrapeMetacriticScore(imdbId, movie.title, movie.release_year);
        }

        // Determine release type
        let releaseType: ReleaseType;
        if (boxOfficeData?.release_scale) {
          releaseType = boxOfficeData.release_scale;
        } else {
          releaseType = determineReleaseType(
            boxOfficeData?.theater_count,
            boxOfficeData?.widest_release,
            !!boxOfficeData
          );
        }

        // Build update object
        const updateData: Record<string, unknown> = {
          box_office_updated_at: new Date().toISOString(),
          release_type: releaseType,
        };

        if (boxOfficeData) {
          if (boxOfficeData.domestic_box_office > 0) {
            updateData.domestic_box_office = boxOfficeData.domestic_box_office;
          }
          if (boxOfficeData.theater_count > 0) {
            updateData.theater_count = boxOfficeData.theater_count;
          }
          if (boxOfficeData.opening_weekend) {
            updateData.opening_weekend = boxOfficeData.opening_weekend;
          }
          if (boxOfficeData.opening_theaters) {
            updateData.opening_theaters = boxOfficeData.opening_theaters;
          }
          if (boxOfficeData.widest_release) {
            updateData.widest_release = boxOfficeData.widest_release;
          }
        }

        if (metacriticScore !== null) {
          updateData.metacritic_score = metacriticScore;
        }

        await supabase
          .from('movies')
          .update(updateData)
          .eq('id', movie.id);

        results.updated++;
        results.movies.push(movie.title);
        console.log(`Refreshed ${movie.title}: bo=${boxOfficeData?.domestic_box_office}, theaters=${boxOfficeData?.theater_count}, mc=${metacriticScore}`);

        // Rate limit: wait 1.5 seconds between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        results.failed++;
        results.errors.push(`${movie.title}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        console.error(`Failed to refresh ${movie.title}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Cron refresh-data error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh data' },
      { status: 500 }
    );
  }
}
