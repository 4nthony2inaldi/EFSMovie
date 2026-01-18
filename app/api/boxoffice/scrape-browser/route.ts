import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeBoxOfficeMojoBrowser } from '@/lib/scraper-browser';
import { scrapeMetacriticScore } from '@/lib/boxofficemojo';
import { tmdb } from '@/lib/tmdb';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for bulk operations

// Create admin Supabase client (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const { movieId, tmdbId, imdbId: providedImdbId, title, releaseYear, releaseDate: providedReleaseDate } = await request.json();

    if (!movieId) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
    }

    let imdbId = providedImdbId;
    let releaseDate = providedReleaseDate;

    // Always try to get fresh IMDB ID and release date from TMDB
    if (tmdbId) {
      try {
        const details = await tmdb.getMovieDetails(tmdbId);
        const detailsAny = details as unknown as {
          external_ids?: { imdb_id?: string };
          imdb_id?: string;
          release_date?: string;
        };
        const tmdbImdbId = detailsAny.external_ids?.imdb_id || detailsAny.imdb_id || null;
        if (tmdbImdbId) {
          console.log(`Got IMDB ID from TMDB: ${tmdbImdbId} (was: ${imdbId})`);
          imdbId = tmdbImdbId;
        }
        // Get release date from TMDB if not provided
        if (!releaseDate && detailsAny.release_date) {
          releaseDate = detailsAny.release_date;
          console.log(`Got release date from TMDB: ${releaseDate}`);
        }
      } catch (e) {
        console.error('Failed to get details from TMDB:', e);
      }
    }

    if (!imdbId) {
      return NextResponse.json({
        error: 'IMDB ID is required for deep scraping',
        suggestion: 'Add IMDB ID to the movie first via quick refresh',
      }, { status: 400 });
    }

    // If we still don't have a release date, construct one from the year
    if (!releaseDate && releaseYear) {
      // Default to January 1 of the release year (we'll scan multiple dates anyway)
      releaseDate = `${releaseYear}-01-01`;
      console.log(`Using constructed release date: ${releaseDate}`);
    }

    // Update the IMDB ID in database if we got a fresh one
    if (imdbId !== providedImdbId) {
      const supabaseForUpdate = getSupabaseAdmin();
      await supabaseForUpdate
        .from('movies')
        .update({ imdb_id: imdbId })
        .eq('id', movieId);
      console.log(`Updated IMDB ID in database: ${imdbId}`);
    }

    console.log(`Starting enhanced scrape for ${imdbId} (${title} ${releaseYear}, release: ${releaseDate})...`);

    // Use multi-source scraper with title/year for theater counts
    const data = await scrapeBoxOfficeMojoBrowser(imdbId, title, releaseYear, releaseDate);

    // Also scrape Metacritic score
    const metacriticScore = title ? await scrapeMetacriticScore(title, releaseYear) : null;

    if (!data && metacriticScore === null) {
      // Return success with skipped status - this is expected for non-theatrical releases
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No theatrical data found (likely streaming/limited release)',
        imdbId,
      });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      box_office_updated_at: new Date().toISOString(),
    };

    if (data) {
      if (data.domestic_box_office > 0) {
        updateData.domestic_box_office = data.domestic_box_office;
      }
      if (data.theater_count > 0) {
        updateData.theater_count = data.theater_count;
      }
      if (data.widest_release) {
        updateData.widest_release = data.widest_release;
      }
      if (data.opening_weekend) {
        updateData.opening_weekend = data.opening_weekend;
      }
      if (data.opening_theaters) {
        updateData.opening_theaters = data.opening_theaters;
      }
    }

    if (metacriticScore !== null) {
      updateData.metacritic_score = metacriticScore;
    }

    // Update the movie in the database
    const supabase = getSupabaseAdmin();
    const { error: updateError } = await supabase
      .from('movies')
      .update(updateData)
      .eq('id', movieId);

    if (updateError) {
      console.error('Failed to update movie:', updateError);
      return NextResponse.json({
        error: 'Failed to update movie in database',
        details: updateError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imdbId,
      data: {
        ...data,
        metacritic_score: metacriticScore,
      },
    });
  } catch (error) {
    console.error('Browser scrape error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Bulk refresh endpoint - refreshes box office, theaters, and metacritic for all movies
export async function PUT(request: NextRequest) {
  try {
    const { movieIds } = await request.json();

    if (!movieIds || !Array.isArray(movieIds)) {
      return NextResponse.json({ error: 'movieIds array is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get movie details
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, tmdb_id, release_year, imdb_id')
      .in('id', movieIds);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process movies with rate limiting (1 per second to avoid rate limits)
    for (const movie of movies || []) {
      try {
        let imdbId = movie.imdb_id;

        // Get IMDB ID from TMDB if we don't have it
        if (!imdbId && movie.tmdb_id) {
          try {
            const details = await tmdb.getMovieDetails(movie.tmdb_id);
            const detailsAny = details as unknown as { external_ids?: { imdb_id?: string }; imdb_id?: string };
            imdbId = detailsAny.external_ids?.imdb_id || detailsAny.imdb_id || null;
          } catch (e) {
            console.error(`Failed to get IMDB ID for ${movie.title}:`, e);
          }
        }

        if (!imdbId) {
          results.failed++;
          results.errors.push(`${movie.title}: No IMDB ID found`);
          continue;
        }

        // Scrape box office and theater data using yearly chart
        const boxOfficeData = await scrapeBoxOfficeMojoBrowser(imdbId, movie.title, movie.release_year);

        // Scrape Metacritic score
        const metacriticScore = await scrapeMetacriticScore(movie.title, movie.release_year);

        if (!boxOfficeData && metacriticScore === null) {
          results.failed++;
          results.errors.push(`${movie.title}: No data found`);
          continue;
        }

        // Build update object with only non-null values
        const updateData: Record<string, unknown> = {
          imdb_id: imdbId,
          box_office_updated_at: new Date().toISOString(),
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

        results.success++;
        console.log(`Updated ${movie.title}: theaters=${boxOfficeData?.theater_count}, metacritic=${metacriticScore}`);

        // Rate limit: wait 1 second between requests to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        results.failed++;
        results.errors.push(`${movie.title}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Bulk refresh error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
