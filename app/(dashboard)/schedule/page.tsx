import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MovieCard } from '@/components/movies/movie-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, getMonthName, isPast, isFuture } from '@/lib/utils';
import { Calendar, Film, Clock, Gavel } from 'lucide-react';
import Link from 'next/link';

// Force dynamic rendering to ensure filters work correctly
export const dynamic = 'force-dynamic';

interface SearchParams {
  tab?: string;
  month?: string;
  genre?: string;
  release_type?: string;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const tab = params.tab || 'upcoming';

  // Get user's team and league
  const { data: { user } } = await supabase.auth.getUser();
  const { data: team } = await supabase
    .from('teams')
    .select('id, league_id')
    .eq('user_id', user?.id)
    .single();

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

  // Then apply tab-specific filters and ordering
  if (tab === 'upcoming') {
    // Movies releasing in next 3 months
    query = query
      .gte('release_date', today.toISOString().split('T')[0])
      .order('release_date', { ascending: true })
      .limit(50);
  } else if (tab === 'theaters') {
    // Movies currently in theaters (released in last 3 months)
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    query = query
      .gte('release_date', threeMonthsAgo.toISOString().split('T')[0])
      .lte('release_date', today.toISOString().split('T')[0])
      .gt('theater_count', 0)
      .order('domestic_box_office', { ascending: false });
  } else if (tab === 'auction') {
    // Movies in next auction
    const { data: nextAuction } = await supabase
      .from('auctions')
      .select('id')
      .eq('league_id', team?.league_id)
      .in('status', ['upcoming', 'open'])
      .order('opens_at', { ascending: true })
      .limit(1)
      .single();

    if (nextAuction) {
      const { data: auctionMovies } = await supabase
        .from('auction_movies')
        .select('movie_id')
        .eq('auction_id', nextAuction.id);

      const movieIds = auctionMovies?.map((am) => am.movie_id) || [];
      if (movieIds.length > 0) {
        query = query.in('id', movieIds);
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // No results
      }
    } else {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // No results
    }
  }

  const { data: movies } = await query;

  // Get ownership for my movies tab
  let myMovies: any[] = [];
  if (tab === 'my' && team) {
    const { data: teamMovies } = await supabase
      .from('team_movies')
      .select('*, movie:movies(*)')
      .eq('team_id', team.id)
      .order('acquired_at', { ascending: false });

    myMovies = teamMovies?.map((tm) => tm.movie).filter(Boolean) || [];
  }

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

  const displayMovies = tab === 'my' ? myMovies : (movies || []);

  // Build tab URLs that preserve filter params
  const buildTabUrl = (tabName: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('tab', tabName);
    // Preserve filter params when switching tabs (except for 'my' tab which doesn't use filters)
    if (tabName !== 'my') {
      if (params.month) searchParams.set('month', params.month);
      if (params.genre) searchParams.set('genre', params.genre);
      if (params.release_type) searchParams.set('release_type', params.release_type);
    }
    return `/schedule?${searchParams.toString()}`;
  };

  return (
    <>
      <Header title="Schedule" subtitle="Movie release schedule" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton href={buildTabUrl('upcoming')} active={tab === 'upcoming'}>
          <Calendar className="h-4 w-4" />
          Upcoming
        </TabButton>
        <TabButton href={buildTabUrl('theaters')} active={tab === 'theaters'}>
          <Film className="h-4 w-4" />
          Now in Theaters
        </TabButton>
        <TabButton href={buildTabUrl('my')} active={tab === 'my'}>
          <Clock className="h-4 w-4" />
          My Movies
        </TabButton>
        <TabButton href={buildTabUrl('auction')} active={tab === 'auction'}>
          <Gavel className="h-4 w-4" />
          Next Auction
        </TabButton>
      </div>

      {/* Filters */}
      {tab !== 'my' && (
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
              <button type="submit" className="btn-primary">
                Filter
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Movies */}
      {displayMovies.length === 0 ? (
        <EmptyState
          icon={<Film className="h-12 w-12" />}
          title="No movies found"
          description={
            tab === 'my'
              ? "You haven't won any movies yet. Head to the auction to start bidding!"
              : tab === 'auction'
                ? "No auction is currently scheduled."
                : "No movies match your criteria."
          }
          action={
            tab === 'my' ? (
              <Link href="/auction" className="btn-primary">
                Go to Auction
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Group by month if showing upcoming */}
          {tab === 'upcoming' ? (
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
