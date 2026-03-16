const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genre_ids: number[];
  runtime?: number;
}

export interface TMDBMovieDetails extends TMDBMovie {
  imdb_id: string | null;
  genres: { id: number; name: string }[];
  runtime: number;
  credits?: {
    cast: { name: string; order: number }[];
    crew: { name: string; job: string }[];
  };
  videos?: {
    results: { key: string; site: string; type: string }[];
  };
}

/**
 * Search for movies by title
 */
export async function searchMovie(title: string, year?: number) {
  const params = new URLSearchParams({
    api_key: process.env.TMDB_API_KEY!,
    query: title,
  });

  if (year) {
    params.append('year', year.toString());
  }

  const res = await fetch(`${TMDB_BASE}/search/movie?${params}`);

  if (!res.ok) {
    throw new Error(`TMDB search failed: ${res.status}`);
  }

  const data = await res.json();
  return data.results as TMDBMovie[];
}

/**
 * Get detailed movie information
 */
export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
  const params = new URLSearchParams({
    api_key: process.env.TMDB_API_KEY!,
    append_to_response: 'credits,videos',
  });

  const res = await fetch(`${TMDB_BASE}/movie/${tmdbId}?${params}`);

  if (!res.ok) {
    throw new Error(`TMDB details failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Get upcoming movies
 */
export async function getUpcomingMovies(page = 1) {
  const params = new URLSearchParams({
    api_key: process.env.TMDB_API_KEY!,
    region: 'US',
    page: page.toString(),
  });

  const res = await fetch(`${TMDB_BASE}/movie/upcoming?${params}`);

  if (!res.ok) {
    throw new Error(`TMDB upcoming failed: ${res.status}`);
  }

  const data = await res.json();
  return data.results as TMDBMovie[];
}

/**
 * Get poster URL
 */
export function getPosterUrl(posterPath: string | null, size = 'w500'): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

/**
 * Get backdrop URL
 */
export function getBackdropUrl(backdropPath: string | null, size = 'w1280'): string | null {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
}

/**
 * Extract director from credits
 */
export function getDirector(credits?: TMDBMovieDetails['credits']): string | null {
  if (!credits?.crew) return null;
  const director = credits.crew.find((person) => person.job === 'Director');
  return director?.name || null;
}

/**
 * Extract top cast members
 */
export function getTopCast(credits?: TMDBMovieDetails['credits'], count = 5): string[] {
  if (!credits?.cast) return [];
  return credits.cast
    .sort((a, b) => a.order - b.order)
    .slice(0, count)
    .map((person) => person.name);
}

/**
 * Get trailer URL
 */
export function getTrailerUrl(videos?: TMDBMovieDetails['videos']): string | null {
  if (!videos?.results) return null;
  const trailer = videos.results.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer'
  );
  if (trailer) {
    return `https://www.youtube.com/watch?v=${trailer.key}`;
  }
  return null;
}

/**
 * Convert TMDB movie to our movie format
 */
export function convertTMDBMovie(tmdb: TMDBMovieDetails) {
  // Parse date string directly to avoid timezone issues
  // (new Date("2026-04-01") becomes March 31 in US timezones)
  const [releaseYear, releaseMonth] = tmdb.release_date
    ? tmdb.release_date.split('-').map(Number)
    : [new Date().getFullYear(), 1];

  return {
    title: tmdb.title,
    release_date: tmdb.release_date || null,
    release_month: releaseMonth,
    release_year: releaseYear,
    tmdb_id: tmdb.id,
    imdb_id: tmdb.imdb_id,
    poster_url: getPosterUrl(tmdb.poster_path),
    backdrop_url: getBackdropUrl(tmdb.backdrop_path),
    genre: tmdb.genres?.map((g) => g.name).join(', ') || null,
    runtime_minutes: tmdb.runtime || null,
    director: getDirector(tmdb.credits),
    cast_list: getTopCast(tmdb.credits),
    synopsis: tmdb.overview || null,
    trailer_url: getTrailerUrl(tmdb.videos),
  };
}
