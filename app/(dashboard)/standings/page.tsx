import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { StandingsTable } from '@/components/standings/standings-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import type { TeamStanding, Movie, TeamMovie } from '@/types';

interface TeamWithMovies extends TeamStanding {
  movies: (TeamMovie & { movie: Movie })[];
}

export default async function StandingsPage() {
  const supabase = await createClient();

  // Get user's team to find their league
  const { data: { user } } = await supabase.auth.getUser();

  const { data: userTeam } = await supabase
    .from('teams')
    .select('league_id')
    .eq('user_id', user?.id)
    .single();

  if (!userTeam?.league_id) {
    return (
      <>
        <Header title="Standings" subtitle="Team leaderboard" />
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Not in a league"
          description="You haven't joined a league yet. Contact your league commissioner to get added."
        />
      </>
    );
  }

  // Get league info
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', userTeam.league_id)
    .single();

  // Get standings using the database function
  const { data: standings } = await supabase
    .rpc('get_league_standings', { p_league_id: userTeam.league_id });

  // Get movies for each team
  const { data: teamMovies } = await supabase
    .from('team_movies')
    .select(`
      *,
      movie:movies(*),
      team:teams!inner(league_id)
    `)
    .eq('team.league_id', userTeam.league_id);

  // Combine standings with movies
  const standingsWithMovies: TeamWithMovies[] = (standings || []).map((team: TeamStanding) => {
    const movies = (teamMovies || [])
      .filter((tm) => tm.team_id === team.team_id)
      .sort((a, b) => (b.movie?.calculated_score || 0) - (a.movie?.calculated_score || 0));

    return {
      ...team,
      movies,
    };
  });

  if (!standings || standings.length === 0) {
    return (
      <>
        <Header
          title="Standings"
          subtitle={league?.name || 'Team leaderboard'}
        />
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title="No teams yet"
          description="No teams have joined this league yet. Check back soon!"
        />
      </>
    );
  }

  return (
    <>
      <Header
        title="Standings"
        subtitle={`${league?.name} - ${league?.season_year} Season`}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <QuickStat
          label="Teams"
          value={standings.length.toString()}
        />
        <QuickStat
          label="Leader"
          value={standings[0]?.team_name || '-'}
        />
        <QuickStat
          label="Top Score"
          value={standings[0]?.total_points?.toFixed(2) || '0.00'}
        />
        <QuickStat
          label="Total Movies"
          value={standingsWithMovies.reduce((sum, t) => sum + t.movies.length, 0).toString()}
        />
      </div>

      {/* Standings Grid */}
      <StandingsTable standings={standingsWithMovies} />
    </>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
    </div>
  );
}
