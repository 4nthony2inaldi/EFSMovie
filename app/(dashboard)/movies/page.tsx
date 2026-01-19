import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { MovieCard } from '@/components/movies/movie-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Film } from 'lucide-react';
import { MONTH_NAMES } from '@/types';

interface SearchParams {
  month?: string;
  owner?: string;
  search?: string;
  genre?: string;
  release_type?: string;
}

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Get user's league
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userTeam } = await supabase
    .from('teams')
    .select('league_id')
    .eq('user_id', user?.id)
    .single();

  // Build query for movies
  let query = supabase
    .from('movies')
    .select('*')
    .order('calculated_score', { ascending: false });

  // Apply filters
  if (params.month) {
    query = query.eq('release_month', parseInt(params.month));
  }

  if (params.search) {
    query = query.ilike('title', `%${params.search}%`);
  }

  if (params.genre) {
    query = query.ilike('genre', `%${params.genre}%`);
  }

  if (params.release_type) {
    query = query.eq('release_type', params.release_type);
  }

  const { data: movies } = await query;

  // Get ownership info
  const { data: teamMovies } = await supabase
    .from('team_movies')
    .select(`
      movie_id,
      team:teams(id, name, league_id)
    `);

  // Filter by owner if needed
  const ownershipMap = new Map<string, string>();
  (teamMovies || []).forEach((tm) => {
    const team = tm.team as unknown as { id: string; name: string; league_id: string } | null;
    if (team && userTeam?.league_id && team.league_id === userTeam.league_id) {
      ownershipMap.set(tm.movie_id, team.name);
    }
  });

  let filteredMovies = movies || [];
  if (params.owner === 'owned') {
    filteredMovies = filteredMovies.filter((m) => ownershipMap.has(m.id));
  } else if (params.owner === 'unowned') {
    filteredMovies = filteredMovies.filter((m) => !ownershipMap.has(m.id));
  }

  return (
    <>
      <Header
        title="Movies"
        subtitle="All movies ranked by score"
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <form className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4">
          {/* Search */}
          <div className="w-full sm:flex-1 sm:min-w-[200px]">
            <input
              type="text"
              name="search"
              placeholder="Search movies..."
              defaultValue={params.search}
              className="input w-full"
            />
          </div>

          {/* Dropdowns row on mobile */}
          <div className="flex flex-wrap gap-2 sm:contents">
            {/* Month Filter */}
            <select
              name="month"
              defaultValue={params.month}
              className="input flex-1 sm:flex-none sm:w-auto min-w-0"
            >
              <option value="">All Months</option>
              {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1].map((m) => (
                <option key={m} value={m}>
                  {MONTH_NAMES[m]}
                </option>
              ))}
            </select>

            {/* Genre Filter */}
            <select
              name="genre"
              defaultValue={params.genre}
              className="input flex-1 sm:flex-none sm:w-auto min-w-0"
            >
              <option value="">All Genres</option>
              <option value="Action">Action</option>
              <option value="Adventure">Adventure</option>
              <option value="Animation">Animation</option>
              <option value="Comedy">Comedy</option>
              <option value="Crime">Crime</option>
              <option value="Documentary">Documentary</option>
              <option value="Drama">Drama</option>
              <option value="Family">Family</option>
              <option value="Fantasy">Fantasy</option>
              <option value="Horror">Horror</option>
              <option value="Music">Music</option>
              <option value="Mystery">Mystery</option>
              <option value="Romance">Romance</option>
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Thriller">Thriller</option>
              <option value="War">War</option>
              <option value="Western">Western</option>
            </select>

            {/* Release Type Filter */}
            <select
              name="release_type"
              defaultValue={params.release_type}
              className="input flex-1 sm:flex-none sm:w-auto min-w-0"
            >
              <option value="">All Release Types</option>
              <option value="wide">Wide</option>
              <option value="limited">Limited</option>
              <option value="streaming">Streaming</option>
            </select>

            {/* Owner Filter */}
            <select
              name="owner"
              defaultValue={params.owner}
              className="input flex-1 sm:flex-none sm:w-auto min-w-0"
            >
              <option value="">All Movies</option>
              <option value="owned">Owned</option>
              <option value="unowned">Unowned</option>
            </select>
          </div>

          <button type="submit" className="btn-primary w-full sm:w-auto">
            Filter
          </button>
        </form>
      </div>

      {/* Movies Grid */}
      {filteredMovies.length === 0 ? (
        <EmptyState
          icon={<Film className="h-12 w-12" />}
          title="No movies found"
          description="Try adjusting your filters or check back later."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-full">
          {filteredMovies.map((movie, index) => (
            <div key={movie.id} className="relative min-w-0">
              <div className="absolute -top-2 -left-2 w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold z-10">
                {index + 1}
              </div>
              <MovieCard
                movie={movie}
                ownerName={ownershipMap.get(movie.id)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
