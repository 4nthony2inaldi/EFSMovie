import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { MovieCard } from '@/components/movies/movie-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Bookmark } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get user's league for ownership info
  const { data: userTeam } = await supabase
    .from('teams')
    .select('league_id')
    .eq('user_id', user.id)
    .single();

  // Get user's watchlist with movie details
  const { data: interests } = await supabase
    .from('movie_interests')
    .select(`
      id,
      movie_id,
      created_at,
      movie:movies(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Get all movies from interests
  const movies = (interests || [])
    .filter((i) => i.movie)
    .map((i) => i.movie as any);

  // Get ownership info
  const { data: teamMovies } = await supabase
    .from('team_movies')
    .select(`
      movie_id,
      team:teams(id, name, league_id)
    `);

  const ownershipMap = new Map<string, string>();
  (teamMovies || []).forEach((tm) => {
    const team = tm.team as unknown as { id: string; name: string; league_id: string } | null;
    if (team && userTeam?.league_id && team.league_id === userTeam.league_id) {
      ownershipMap.set(tm.movie_id, team.name);
    }
  });

  // Create a set of watchlisted movie IDs (all of them since this is the watchlist page)
  const watchlistSet = new Set<string>(movies.map((m) => m.id));

  return (
    <>
      <Header
        title="My Watchlist"
        subtitle="Movies you're interested in watching"
      />

      {movies.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-12 w-12" />}
          title="Your watchlist is empty"
          description="Browse movies and click the bookmark icon to add them to your watchlist."
          action={
            <Link href="/movies" className="btn-primary">
              Browse Movies
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-gray-600 mb-6">
            {movies.length} movie{movies.length !== 1 ? 's' : ''} on your watchlist
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-full">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                ownerName={ownershipMap.get(movie.id)}
                isOnWatchlist={watchlistSet.has(movie.id)}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
