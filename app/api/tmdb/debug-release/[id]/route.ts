import { NextRequest, NextResponse } from 'next/server';
import { tmdb } from '@/lib/tmdb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const movieId = parseInt(params.id);

  if (isNaN(movieId)) {
    return NextResponse.json({ error: 'Invalid movie ID' }, { status: 400 });
  }

  try {
    const releaseDates = await tmdb.getReleaseDates(movieId);

    // Find US release
    const usRelease = releaseDates.results.find(r => r.iso_3166_1 === 'US');

    // Release type meanings
    const releaseTypeNames: Record<number, string> = {
      1: 'Premiere',
      2: 'Theatrical (limited)',
      3: 'Theatrical',
      4: 'Digital',
      5: 'Physical',
      6: 'TV'
    };

    return NextResponse.json({
      movieId,
      usRelease: usRelease ? {
        releases: usRelease.release_dates.map(r => ({
          date: r.release_date,
          type: r.type,
          typeName: releaseTypeNames[r.type] || 'Unknown',
          certification: r.certification,
          note: r.note
        }))
      } : null,
      allCountries: releaseDates.results.map(r => r.iso_3166_1),
      note: 'The discover API filters with_release_type=2|3 only returns type 2 (Theatrical limited) and type 3 (Theatrical). Type 1 (Premiere) is excluded.'
    });
  } catch (error) {
    console.error('TMDB API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch release dates from TMDB' },
      { status: 500 }
    );
  }
}
