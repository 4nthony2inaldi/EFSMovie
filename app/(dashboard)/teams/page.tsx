import { createClient } from '@/lib/supabase/server';
import { getCurrentTeam } from '@/lib/get-current-team';
import type { TeamStanding } from '@/types';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { formatScore } from '@/lib/scoring';
import { formatCurrency } from '@/lib/utils';
import { Users, Trophy, DollarSign, Film } from 'lucide-react';

export default async function TeamsPage() {
  const supabase = await createClient();

  // Get user's current team and league
  const currentTeam = await getCurrentTeam();

  if (!currentTeam?.league_id) {
    return (
      <>
        <Header title="Teams" subtitle="All teams in your league" />
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Not in a league"
          description="You haven't joined a league yet."
        />
      </>
    );
  }

  // Get standings
  const { data: standings } = await supabase
    .rpc('get_league_standings', { p_league_id: currentTeam.league_id });

  if (!standings || standings.length === 0) {
    return (
      <>
        <Header title="Teams" subtitle="All teams in your league" />
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No teams yet"
          description="No teams have joined this league yet."
        />
      </>
    );
  }

  return (
    <>
      <Header title="Teams" subtitle="All teams in your league" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {standings.map((team: TeamStanding) => (
          <Link key={team.team_id} href={`/teams/${team.team_id}`}>
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar name={team.team_name} src={team.photo_url} size="xl" />
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {team.team_name}
                    </h3>
                    <p className="text-gray-500">Rank #{team.rank}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Stat
                    icon={<Trophy className="h-4 w-4 text-purple-600" />}
                    label="Points"
                    value={formatScore(team.total_points)}
                  />
                  <Stat
                    icon={<DollarSign className="h-4 w-4 text-green-600" />}
                    label="Budget"
                    value={formatCurrency(team.budget_remaining)}
                  />
                  <Stat
                    icon={<Film className="h-4 w-4 text-blue-600" />}
                    label="Movies"
                    value={team.movies_owned.toString()}
                  />
                  <Stat
                    icon={<Trophy className="h-4 w-4 text-gold-500" />}
                    label="Oscar Pts"
                    value={formatScore(team.oscar_points)}
                  />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  );
}
