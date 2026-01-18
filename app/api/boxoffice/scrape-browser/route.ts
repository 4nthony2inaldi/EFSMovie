import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeBoxOfficeMojoBrowser } from '@/lib/scraper-browser';
import { tmdb } from '@/lib/tmdb';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow up to 30 seconds for multi-source scraping

// Create admin Supabase client (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const { movieId, tmdbId, imdbId: providedImdbId, title, releaseYear } = await request.json();

    if (!movieId) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
    }

    let imdbId = providedImdbId;

    // Always try to get fresh IMDB ID from TMDB (the stored one might be wrong)
    if (tmdbId) {
      try {
        const details = await tmdb.getMovieDetails(tmdbId);
        const detailsAny = details as unknown as { external_ids?: { imdb_id?: string }; imdb_id?: string };
        const tmdbImdbId = detailsAny.external_ids?.imdb_id || detailsAny.imdb_id || null;
        if (tmdbImdbId) {
          console.log(`Got IMDB ID from TMDB: ${tmdbImdbId} (was: ${imdbId})`);
          imdbId = tmdbImdbId;
        }
      } catch (e) {
        console.error('Failed to get IMDB ID from TMDB:', e);
      }
    }

    if (!imdbId) {
      return NextResponse.json({
        error: 'IMDB ID is required for deep scraping',
        suggestion: 'Add IMDB ID to the movie first via quick refresh',
      }, { status: 400 });
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

    console.log(`Starting enhanced scrape for ${imdbId} (${title} ${releaseYear})...`);

    // Use multi-source scraper with title/year for fallback sources
    const data = await scrapeBoxOfficeMojoBrowser(imdbId, title, releaseYear);

    if (!data) {
      return NextResponse.json({
        error: 'Failed to scrape data from any source',
        imdbId,
        triedSources: ['Box Office Mojo', 'The Numbers'],
      }, { status: 500 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      box_office_updated_at: new Date().toISOString(),
    };

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
      data,
    });
  } catch (error) {
    console.error('Browser scrape error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
