// Run with: npx ts-node --esm scripts/check-mario-release.ts
// Or: npx tsx scripts/check-mario-release.ts

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error('Please set TMDB_API_KEY environment variable');
  process.exit(1);
}

const MARIO_MOVIE_ID = 1226863;

async function checkReleaseDates() {
  console.log('Fetching release dates for The Super Mario Galaxy Movie (ID: 1226863)...\n');

  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${MARIO_MOVIE_ID}/release_dates?api_key=${TMDB_API_KEY}`
  );
  const data = await response.json();

  const releaseTypeNames: Record<number, string> = {
    1: 'Premiere',
    2: 'Theatrical (limited)',
    3: 'Theatrical',
    4: 'Digital',
    5: 'Physical',
    6: 'TV'
  };

  const usRelease = data.results?.find((r: any) => r.iso_3166_1 === 'US');

  if (usRelease) {
    console.log('US Release Dates:');
    usRelease.release_dates.forEach((r: any) => {
      console.log(`  - ${r.release_date} | Type ${r.type} (${releaseTypeNames[r.type]}) | Cert: ${r.certification}`);
    });
  } else {
    console.log('No US release found!');
  }

  console.log('\n--- Checking Discover API ---\n');

  // Now check if it appears in discover for April 2026
  const discoverResponse = await fetch(
    `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&region=US&with_release_type=2|3&release_date.gte=2026-04-01&release_date.lte=2026-04-30&sort_by=popularity.desc`
  );
  const discoverData = await discoverResponse.json();

  const marioInDiscover = discoverData.results?.find((m: any) => m.id === MARIO_MOVIE_ID);

  if (marioInDiscover) {
    console.log('Movie FOUND in discover results for April 2026 with release_type=2|3');
  } else {
    console.log('Movie NOT FOUND in discover results for April 2026 with release_type=2|3');
    console.log(`Total movies returned: ${discoverData.results?.length}`);
    console.log(`Total pages: ${discoverData.total_pages}`);
    console.log('\nFirst 5 movies returned:');
    discoverData.results?.slice(0, 5).forEach((m: any) => {
      console.log(`  - ${m.title} (${m.release_date})`);
    });
  }

  // Also try without release type filter
  console.log('\n--- Trying without release_type filter ---\n');

  const discoverNoTypeResponse = await fetch(
    `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&region=US&release_date.gte=2026-04-01&release_date.lte=2026-04-30&sort_by=popularity.desc`
  );
  const discoverNoTypeData = await discoverNoTypeResponse.json();

  const marioInDiscoverNoType = discoverNoTypeData.results?.find((m: any) => m.id === MARIO_MOVIE_ID);

  if (marioInDiscoverNoType) {
    console.log('Movie FOUND in discover results WITHOUT release_type filter');
    console.log('This suggests the release_type=2|3 filter is excluding it');
  } else {
    console.log('Movie NOT FOUND even without release_type filter');
  }
}

checkReleaseDates().catch(console.error);
