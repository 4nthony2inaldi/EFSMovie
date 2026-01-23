import { createClient } from '@/lib/supabase/server';
import { getCurrentTeam } from '@/lib/get-current-team';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MovieCard } from '@/components/movies/movie-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, getMonthName, isPast, isFuture } from '@/lib/utils';
import { Calendar, Film, Clock } from 'lucide-react';
import Link from 'next/link';

// Force dynamic rendering to ensure filters work correctly
export const dynamic = 'force-dynamic';

interface SearchParams {
  tab?: string;
  month?: string;
  genre?: string;
  release_type?: string;
  studio?: string;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const tab = params.tab || 'all';

  // Get user's current team and league
  const team = await getCurrentTeam();

  // Get movies based on tab
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  let query = supabase.from('movies').select('*');

  // Apply user filters FIRST (before tab-specific filters)
  // This ensures filters work correctly with all tabs
  if (params.month) {
    query = query.eq('release_month', parseInt(params.month));
  }

  if (params.genre) {
    query = query.ilike('genre', `%${params.genre}%`);
  }

  if (params.release_type) {
    query = query.eq('release_type', params.release_type);
  }

  if (params.studio) {
    query = query.contains('production_companies', [params.studio]);
  }

  // Then apply tab-specific filters and ordering
  if (tab === 'all') {
    // All movies, ordered by release date
    query = query
      .order('release_date', { ascending: true });
  } else if (tab === 'theaters') {
    // Movies currently in theaters (released in last 3 months with theater count)
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    query = query
      .gte('release_date', threeMonthsAgo.toISOString().split('T')[0])
      .lte('release_date', today.toISOString().split('T')[0])
      .gt('theater_count', 0)
      .order('domestic_box_office', { ascending: false });
  } else if (tab === 'upcoming') {
    // Movies not yet released (release_date >= today)
    query = query
      .gte('release_date', today.toISOString().split('T')[0])
      .order('release_date', { ascending: true });
  }

  const { data: movies } = await query;

  // Get ownership info for display
  const { data: teamMovies } = await supabase
    .from('team_movies')
    .select('movie_id, team:teams(id, name, league_id)');

  const ownershipMap = new Map<string, string>();
  (teamMovies || []).forEach((tm) => {
    const tmTeam = tm.team as unknown as { id: string; name: string; league_id: string } | null;
    if (tmTeam && team?.league_id && tmTeam.league_id === team.league_id) {
      ownershipMap.set(tm.movie_id, tmTeam.name);
    }
  });

  // Get unique production companies for filter dropdown
  const { data: allMoviesForStudios } = await supabase
    .from('movies')
    .select('production_companies');

  const studioSet = new Set<string>();
  (allMoviesForStudios || []).forEach((m) => {
    if (m.production_companies) {
      m.production_companies.forEach((company: string) => studioSet.add(company));
    }
  });
  const studios = Array.from(studioSet).sort();

  const displayMovies = movies || [];

  // Build tab URLs that preserve filter params
  const buildTabUrl = (tabName: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('tab', tabName);
    if (params.month) searchParams.set('month', params.month);
    if (params.genre) searchParams.set('genre', params.genre);
    if (params.release_type) searchParams.set('release_type', params.release_type);
    if (params.studio) searchParams.set('studio', params.studio);
    return `/schedule?${searchParams.toString()}`;
  };

  return (
    <>
      <Header title="Schedule" subtitle="Movie release schedule" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton href={buildTabUrl('all')} active={tab === 'all'}>
          <Film className="h-4 w-4" />
          All Movies
        </TabButton>
        <TabButton href={buildTabUrl('theaters')} active={tab === 'theaters'}>
          <Clock className="h-4 w-4" />
          In Theaters
        </TabButton>
        <TabButton href={buildTabUrl('upcoming')} active={tab === 'upcoming'}>
          <Calendar className="h-4 w-4" />
          Upcoming
        </TabButton>
      </div>

      {/* Filters */}
      <Card className="mb-6">
          <CardContent className="p-4">
            <form className="flex flex-wrap gap-2 sm:gap-4">
              <input type="hidden" name="tab" value={tab} />
              <select
                name="month"
                defaultValue={params.month}
                className="input w-auto"
              >
                <option value="">All Months</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    {getMonthName(m)}
                  </option>
                ))}
              </select>
              <select
                name="genre"
                defaultValue={params.genre}
                className="input w-auto"
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
              <select
                name="release_type"
                defaultValue={params.release_type}
                className="input w-auto"
              >
                <option value="">All Release Types</option>
                <option value="wide">Wide</option>
                <option value="limited">Limited</option>
                <option value="streaming">Streaming</option>
              </select>
              <select
                name="studio"
                defaultValue={params.studio}
                className="input w-auto"
              >
                <option value="">All Studios</option>
                {studios.map((studio) => (
                  <option key={studio} value={studio}>
                    {studio}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-primary">
                Filter
              </button>
            </form>
          </CardContent>
        </Card>

      {/* Movies */}
      {displayMovies.length === 0 ? (
        <EmptyState
          icon={<Film className="h-12 w-12" />}
          title="No movies found"
          description="No movies match your criteria."
        />
      ) : (
        <>
          {/* Group by month for all and upcoming tabs */}
          {(tab === 'all' || tab === 'upcoming') ? (
            <GroupedMovies movies={displayMovies} ownershipMap={ownershipMap} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  ownerName={ownershipMap.get(movie.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function TabButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-purple-600 text-white'
          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
    </Link>
  );
}

function GroupedMovies({
  movies,
  ownershipMap,
}: {
  movies: any[];
  ownershipMap: Map<string, string>;
}) {
  // Group by month/year
  const groups = new Map<string, any[]>();

  movies.forEach((movie) => {
    const key = `${movie.release_year}-${movie.release_month}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(movie);
  });

  return (
    <div className="space-y-8">
      {Array.from(groups.entries()).map(([key, groupMovies]) => {
        const [year, month] = key.split('-').map(Number);
        return (
          <div key={key}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {getMonthName(month)} {year}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  ownerName={ownershipMap.get(movie.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
