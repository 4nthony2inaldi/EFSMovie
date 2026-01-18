import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeBoxOfficeMojoBrowser } from '@/lib/scraper-browser';
import { tmdb } from '@/lib/tmdb';

// Force Node.js runtime for Puppeteer
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for browser scraping

// Create admin Supabase client (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const { movieId, tmdbId, imdbId: providedImdbId } = await request.json();

    if (!movieId) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
    }

    let imdbId = providedImdbId;

    // Try to get IMDB ID from TMDB if not provided
    if (!imdbId && tmdbId) {
      try {
        const details = await tmdb.getMovieDetails(tmdbId);
        const detailsAny = details as unknown as { external_ids?: { imdb_id?: string }; imdb_id?: string };
        imdbId = detailsAny.external_ids?.imdb_id || detailsAny.imdb_id || null;
      } catch (e) {
        console.error('Failed to get IMDB ID from TMDB:', e);
      }
    }

    if (!imdbId) {
      return NextResponse.json({
        error: 'IMDB ID is required for browser scraping',
        suggestion: 'Add IMDB ID to the movie first',
      }, { status: 400 });
    }

    console.log(`Starting browser scrape for ${imdbId}...`);

    // Use browser-based scraper
    const data = await scrapeBoxOfficeMojoBrowser(imdbId);

    if (!data) {
      return NextResponse.json({
        error: 'Failed to scrape data with browser',
        imdbId,
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
