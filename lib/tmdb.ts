const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  vote_average: number;
  popularity: number;
}

export interface TMDBMovieDetails extends TMDBMovie {
  runtime: number | null;
  budget: number;
  revenue: number;
  genres: { id: number; name: string }[];
  credits?: {
    cast: { name: string; character: string; order: number }[];
    crew: { name: string; job: string }[];
  };
  videos?: {
    results: { key: string; site: string; type: string }[];
  };
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// Genre ID to name mapping
const GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

class TMDBClient {
  private apiKey: string;
  private isBearerToken: boolean;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || '';
    // Detect if it's a bearer token (JWT) or API key
    this.isBearerToken = this.apiKey.startsWith('eyJ');
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const searchParams = new URLSearchParams(params);

    // If using API key (not bearer token), add it to query params
    if (!this.isBearerToken && this.apiKey) {
      searchParams.set('api_key', this.apiKey);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // If using bearer token, add Authorization header
    if (this.isBearerToken && this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${searchParams}`, {
      headers,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TMDB API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Get upcoming movies
  async getUpcoming(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return this.fetch<TMDBResponse<TMDBMovie>>('/movie/upcoming', {
      page: page.toString(),
      region: 'US',
    });
  }

  // Get movies by release date range
  async discoverByReleaseDates(
    startDate: string,
    endDate: string,
    page = 1,
    options: { restrictReleaseType?: boolean } = {}
  ): Promise<TMDBResponse<TMDBMovie>> {
    const params: Record<string, string> = {
      page: page.toString(),
      'primary_release_date.gte': startDate,
      'primary_release_date.lte': endDate,
      sort_by: 'popularity.desc',
      'vote_count.gte': '0',
      with_original_language: 'en',
    };

    // Only restrict to theatrical for past/current releases
    if (options.restrictReleaseType) {
      params.with_release_type = '2|3';
      params.region = 'US';
    }

    return this.fetch<TMDBResponse<TMDBMovie>>('/discover/movie', params);
  }

  // Get movies releasing in a specific month
  async getMoviesByMonth(year: number, month: number): Promise<TMDBMovie[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

    // Check if this is a past date (restrict to theatrical releases) or future (be more permissive)
    const today = new Date();
    const targetDate = new Date(year, month - 1, 1);
    const isPast = targetDate < today;

    const allMovies: TMDBMovie[] = [];
    let page = 1;
    let totalPages = 1;

    // Fetch up to 3 pages (60 movies max per month)
    while (page <= Math.min(totalPages, 3)) {
      const response = await this.discoverByReleaseDates(startDate, endDate, page, {
        restrictReleaseType: isPast,
      });
      allMovies.push(...response.results);
      totalPages = response.total_pages;
      page++;
    }

    return allMovies;
  }

  // Get movie details with credits
  async getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
    return this.fetch<TMDBMovieDetails>(`/movie/${movieId}`, {
      append_to_response: 'credits,videos',
    });
  }

  // Search movies
  async searchMovies(query: string, year?: number): Promise<TMDBResponse<TMDBMovie>> {
    const params: Record<string, string> = { query };
    if (year) {
      params.year = year.toString();
    }
    return this.fetch<TMDBResponse<TMDBMovie>>('/search/movie', params);
  }

  // Helper to get full poster URL
  static getPosterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  // Helper to get full backdrop URL
  static getBackdropUrl(path: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  // Helper to get genre name
  static getGenreName(genreId: number): string {
    return GENRES[genreId] || 'Unknown';
  }

  // Helper to get primary genre from genre_ids
  static getPrimaryGenre(genreIds: number[]): string {
    if (genreIds.length === 0) return 'Unknown';
    return GENRES[genreIds[0]] || 'Unknown';
  }

  // Helper to get YouTube trailer URL
  static getTrailerUrl(videos?: TMDBMovieDetails['videos']): string | null {
    if (!videos?.results) return null;
    const trailer = videos.results.find(
      (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
  }

  // Helper to get director from credits
  static getDirector(credits?: TMDBMovieDetails['credits']): string | null {
    if (!credits?.crew) return null;
    const director = credits.crew.find((c) => c.job === 'Director');
    return director?.name || null;
  }

  // Helper to get top cast
  static getTopCast(credits?: TMDBMovieDetails['credits'], limit = 5): string[] {
    if (!credits?.cast) return [];
    return credits.cast.slice(0, limit).map((c) => c.name);
  }
}

export const tmdb = new TMDBClient();
export { TMDBClient };
// Trigger rebuild 1768758151
// Production deploy 1768758621
