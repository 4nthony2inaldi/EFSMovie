import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeBoxOfficeData, searchBoxOfficeMojo, scrapeMetacriticScore } from '@/lib/boxofficemojo';
import { tmdb } from '@/lib/tmdb';
import { getMovieRatings } from '@/lib/api/omdb';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create admin Supabase client (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const { movieId, tmdbId, title, releaseYear } = await request.json();

    if (!movieId) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
    }

    let imdbId: string | null = null;

    // Try to get IMDB ID from TMDB if we have a TMDB ID
    if (tmdbId) {
      try {
        const details = await tmdb.getMovieDetails(tmdbId);
        // TMDB returns external_ids in the response when appended
        const detailsAny = details as unknown as { external_ids?: { imdb_id?: string }; imdb_id?: string };
        imdbId = detailsAny.external_ids?.imdb_id || detailsAny.imdb_id || null;
      } catch (e) {
        console.error('Failed to get IMDB ID from TMDB:', e);
      }
    }

    // If no IMDB ID, try searching BOM by title
    if (!imdbId && title) {
      imdbId = await searchBoxOfficeMojo(title, releaseYear);
    }

    if (!imdbId) {
      return NextResponse.json({
        error: 'Could not find IMDB ID for this movie',
        suggestion: 'Try adding the IMDB ID manually',
      }, { status: 404 });
    }

    // Scrape Box Office Mojo
    const boxOfficeData = await scrapeBoxOfficeData(imdbId);

    // Get Metacritic score - try OMDB API first, then fallback to scraping
    let metacriticScore: number | null = null;
    try {
      const omdbRatings = await getMovieRatings(imdbId);
      metacriticScore = omdbRatings.metacritic;
      console.log(`OMDB Metacritic for ${title}: ${metacriticScore}`);
    } catch (omdbError) {
      console.log(`OMDB failed for ${title}, trying scrape fallback:`, omdbError);
    }

    // Fallback to scraping IMDB if OMDB didn't have data
    if (metacriticScore === null) {
      metacriticScore = await scrapeMetacriticScore(imdbId, title, releaseYear);
    }

    if (!boxOfficeData && !metacriticScore) {
      return NextResponse.json({
        error: 'Failed to scrape any data',
        imdbId,
        suggestion: 'The movie may not have box office or review data yet',
      }, { status: 404 });
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
      if (boxOfficeData.theater_count || boxOfficeData.widest_release) {
        updateData.theater_count = boxOfficeData.theater_count || boxOfficeData.widest_release;
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
    } else {
      // Explicitly clear metacritic_score if we couldn't find a valid score
      // This fixes movies with incorrect scores (e.g., false 100%)
      updateData.metacritic_score = null;
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
        ...boxOfficeData,
        metacritic_score: metacriticScore,
      },
    });
  } catch (error) {
    console.error('Box office refresh error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Bulk refresh endpoint
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

    // Process movies with rate limiting (1 per second)
    for (const movie of movies || []) {
      try {
        let imdbId = movie.imdb_id;

        // Get IMDB ID if we don't have it
        if (!imdbId && movie.tmdb_id) {
          const details = await tmdb.getMovieDetails(movie.tmdb_id);
          const detailsAny = details as unknown as { external_ids?: { imdb_id?: string }; imdb_id?: string };
          imdbId = detailsAny.external_ids?.imdb_id || detailsAny.imdb_id || null;
        }

        if (!imdbId) {
          imdbId = await searchBoxOfficeMojo(movie.title, movie.release_year);
        }

        if (!imdbId) {
          results.failed++;
          results.errors.push(`${movie.title}: No IMDB ID found`);
          continue;
        }

        const boxOfficeData = await scrapeBoxOfficeData(imdbId);

        // Get Metacritic score - try OMDB API first, then fallback to scraping
        let metacriticScore: number | null = null;
        try {
          const omdbRatings = await getMovieRatings(imdbId);
          metacriticScore = omdbRatings.metacritic;
          console.log(`OMDB Metacritic for ${movie.title}: ${metacriticScore}`);
        } catch (omdbError) {
          console.log(`OMDB failed for ${movie.title}, trying scrape fallback`);
        }

        // Fallback to scraping IMDB if OMDB didn't have data
        if (metacriticScore === null) {
          metacriticScore = await scrapeMetacriticScore(imdbId, movie.title, movie.release_year);
        }

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
          if (boxOfficeData.theater_count || boxOfficeData.widest_release) {
            updateData.theater_count = boxOfficeData.theater_count || boxOfficeData.widest_release;
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
        } else {
          // Explicitly clear metacritic_score if we couldn't find a valid score
          updateData.metacritic_score = null;
        }

        await supabase
          .from('movies')
          .update(updateData)
          .eq('id', movie.id);

        results.success++;

        // Rate limit: wait 1 second between requests
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
