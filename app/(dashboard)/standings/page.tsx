import { createClient } from '@/lib/supabase/server';
import { getCurrentTeam } from '@/lib/get-current-team';
import { Header } from '@/components/layout/header';
import { StandingsTable } from '@/components/standings/standings-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Trophy, Users, Gavel, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { TeamStanding, Movie, TeamMovie, Auction } from '@/types';
import { getMonthName } from '@/lib/utils';

interface TeamWithMovies extends TeamStanding {
  movies: (TeamMovie & { movie: Movie })[];
  has_submitted_bids?: boolean;
}

export default async function StandingsPage() {
  const supabase = await createClient();

  // Get user's current team and league
  const currentTeam = await getCurrentTeam();

  if (!currentTeam?.league_id) {
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

  const league = currentTeam.league;

  // Get standings using the database function
  const { data: standings } = await supabase
    .rpc('get_league_standings', { p_league_id: currentTeam.league_id });

  // Get movies for each team
  const { data: teamMovies } = await supabase
    .from('team_movies')
    .select(`
      *,
      movie:movies(*),
      team:teams!inner(league_id)
    `)
    .eq('team.league_id', currentTeam.league_id);

  // Get active auction (open status)
  const { data: activeAuction } = await supabase
    .from('auctions')
    .select('*')
    .eq('league_id', currentTeam.league_id)
    .eq('status', 'open')
    .single();

  // Get all teams in this league
  const { data: leagueTeams } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', currentTeam.league_id);

  // Get teams that have submitted bids for the active auction
  // Using a database function to bypass RLS and see all teams' submission status
  let teamsWithBids: Set<string> = new Set();
  if (activeAuction) {
    const { data: submissionStatus } = await supabase
      .rpc('get_auction_submission_status', { p_auction_id: activeAuction.id });

    if (submissionStatus) {
      for (const row of submissionStatus) {
        if (row.has_submitted) {
          teamsWithBids.add(row.team_id);
        }
      }
    }
  }

  const totalTeams = leagueTeams?.length || 0;
  const teamsSubmitted = teamsWithBids.size;
  const teamsPending = totalTeams - teamsSubmitted;
  const currentUserHasSubmitted = teamsWithBids.has(currentTeam.id);

  // Combine standings with movies and bid status
  const standingsWithMovies: TeamWithMovies[] = (standings || []).map((team: TeamStanding) => {
    const movies = (teamMovies || [])
      .filter((tm) => tm.team_id === team.team_id)
      .sort((a, b) => (b.movie?.calculated_score || 0) - (a.movie?.calculated_score || 0));

    return {
      ...team,
      movies,
      has_submitted_bids: activeAuction ? teamsWithBids.has(team.team_id) : undefined,
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

      {/* Active Auction Banner */}
      {activeAuction && (
        <div className="mb-6 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4 sm:p-5 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Gavel className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {getMonthName(activeAuction.for_month)} {activeAuction.for_year} Auction
                </h3>
                <div className="flex items-center gap-2 text-purple-100 text-sm mt-0.5">
                  <Clock className="h-4 w-4" />
                  <span>
                    Closes {new Date(activeAuction.closes_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-sm">
                {teamsPending > 0 ? (
                  <span className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1 rounded-full">
                    <AlertCircle className="h-4 w-4 text-amber-200" />
                    <span className="text-amber-100">{teamsPending} team{teamsPending !== 1 ? 's' : ''} pending</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-green-500/20 px-3 py-1 rounded-full">
                    <CheckCircle2 className="h-4 w-4 text-green-200" />
                    <span className="text-green-100">All teams submitted!</span>
                  </span>
                )}
              </div>

              <Link
                href={`/auction/${activeAuction.id}`}
                className="bg-white text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center gap-2 text-sm"
              >
                <Gavel className="h-4 w-4" />
                {currentUserHasSubmitted ? 'Edit Picks' : 'Make Picks'}
              </Link>
            </div>
          </div>
        </div>
      )}

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
