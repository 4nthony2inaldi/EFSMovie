const OMDB_BASE = 'https://www.omdbapi.com';

export interface OMDBMovie {
  Title: string;
  Year: string;
  imdbID: string;
  Metascore: string;
  imdbRating: string;
  BoxOffice: string;
  Ratings: { Source: string; Value: string }[];
}

/**
 * Get movie ratings from OMDb
 */
export async function getMovieRatings(imdbId: string): Promise<{
  metacritic: number | null;
  rottenTomatoes: number | null;
  imdbRating: number | null;
}> {
  const params = new URLSearchParams({
    apikey: process.env.OMDB_API_KEY!,
    i: imdbId,
  });

  const res = await fetch(`${OMDB_BASE}/?${params}`);

  if (!res.ok) {
    throw new Error(`OMDb request failed: ${res.status}`);
  }

  const data: OMDBMovie = await res.json();

  // Parse Metacritic score
  const metacritic = data.Metascore && data.Metascore !== 'N/A'
    ? parseInt(data.Metascore)
    : null;

  // Parse Rotten Tomatoes score
  const rtRating = data.Ratings?.find((r) => r.Source === 'Rotten Tomatoes');
  const rottenTomatoes = rtRating
    ? parseInt(rtRating.Value.replace('%', ''))
    : null;

  // Parse IMDb rating
  const imdbRating = data.imdbRating && data.imdbRating !== 'N/A'
    ? parseFloat(data.imdbRating)
    : null;

  return {
    metacritic,
    rottenTomatoes,
    imdbRating,
  };
}

/**
 * Search for a movie by title
 */
export async function searchMovie(title: string, year?: number) {
  const params = new URLSearchParams({
    apikey: process.env.OMDB_API_KEY!,
    t: title,
  });

  if (year) {
    params.append('y', year.toString());
  }

  const res = await fetch(`${OMDB_BASE}/?${params}`);

  if (!res.ok) {
    throw new Error(`OMDb search failed: ${res.status}`);
  }

  return res.json();
}
