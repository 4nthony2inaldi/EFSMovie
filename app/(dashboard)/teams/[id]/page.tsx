import { createClient } from '@/lib/supabase/server';
import type { Movie } from '@/types';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MovieCard } from '@/components/movies/movie-card';
import { formatScore, formatBoxOffice, formatMetacritic } from '@/lib/scoring';
import { formatCurrency, formatNumber, getMonthName } from '@/lib/utils';
import {
  ArrowLeft,
  Trophy,
  DollarSign,
  Film,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get team with movies
  const { data: team } = await supabase
    .from('teams')
    .select(`
      *,
      league:leagues(*)
    `)
    .eq('id', id)
    .single();

  if (!team) {
    notFound();
  }

  // Get team's movies
  const { data: teamMovies } = await supabase
    .from('team_movies')
    .select(`
      *,
      movie:movies(*),
      auction:auctions(for_month, for_year)
    `)
    .eq('team_id', id)
    .order('acquired_at', { ascending: false });

  // Get standings to find rank
  const { data: standings } = await supabase
    .rpc('get_league_standings', { p_league_id: team.league_id });

  const teamStanding = standings?.find((s: { team_id: string }) => s.team_id === id);

  // Calculate stats
  const movies = (teamMovies || [])
    .map((tm) => (tm as unknown as { movie: Movie | null }).movie)
    .filter((m): m is Movie => m != null);
  const totalPoints = movies.reduce((sum, m) => sum + (m?.calculated_score || 0), 0);
  const totalBoxOffice = movies.reduce((sum, m) => sum + (m?.domestic_box_office || 0), 0);
  const avgTheaters = movies.length > 0
    ? movies.reduce((sum, m) => sum + (m?.theater_count || 0), 0) / movies.length
    : 0;
  const avgRating = movies.length > 0
    ? movies.reduce((sum, m) => sum + (m?.metacritic_score || 0), 0) / movies.length
    : 0;
  const oscarPoints = movies.reduce((sum, m) => {
    if (!m) return sum;
    return sum +
      (m.oscar_nominations * 0.5) +
      (m.oscar_wins * 1.0) +
      (m.best_picture_nominated ? 0.5 : 0) +
      (m.best_picture_won ? 1.0 : 0);
  }, 0);

  return (
    <>
      <Link
        href="/teams"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Teams
      </Link>

      {/* Team Header */}
      <Card className="mb-8 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <Avatar name={team.name} src={team.photo_url} size="xl" className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{team.name}</h1>
                {teamStanding?.rank === 1 && (
                  <Badge variant="gold">1st Place</Badge>
                )}
                {teamStanding?.rank === 2 && (
                  <Badge variant="default">2nd Place</Badge>
                )}
                {teamStanding?.rank === 3 && (
                  <Badge variant="default">3rd Place</Badge>
                )}
              </div>
              <p className="text-gray-600 text-sm sm:text-base truncate">
                Rank #{teamStanding?.rank || '-'} in {team.league?.name}
              </p>
            </div>

            <div className="bg-purple-100 rounded-xl px-4 sm:px-6 py-3 sm:py-4 text-center flex-shrink-0">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                {formatScore(totalPoints)}
              </div>
              <div className="text-xs sm:text-sm text-purple-700">Total Points</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Stats */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow
                icon={<DollarSign className="h-5 w-5 text-green-600" />}
                label="Budget Remaining"
                value={formatCurrency(team.budget_remaining)}
              />
              <StatRow
                icon={<Film className="h-5 w-5 text-blue-600" />}
                label="Movies Owned"
                value={movies.length.toString()}
              />
              <StatRow
                icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
                label="Total Box Office"
                value={formatBoxOffice(totalBoxOffice)}
              />
              <StatRow
                icon={<Users className="h-5 w-5 text-blue-500" />}
                label="Avg Theaters"
                value={formatNumber(Math.round(avgTheaters))}
              />
              <StatRow
                icon={<Star className="h-5 w-5 text-gold-500" />}
                label="Avg Rating"
                value={formatMetacritic(avgRating)}
              />
              <StatRow
                icon={<Trophy className="h-5 w-5 text-gold-600" />}
                label="Oscar Points"
                value={formatScore(oscarPoints)}
              />
            </CardContent>
          </Card>

          {teamStanding && (
            <Card>
              <CardHeader>
                <CardTitle>Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-5xl font-bold text-purple-600 mb-2">
                    #{teamStanding.rank}
                  </div>
                  <p className="text-gray-600">
                    {teamStanding.points_back > 0
                      ? `${formatScore(teamStanding.points_back)} points behind leader`
                      : 'Leading the league!'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Movies */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Movies ({movies.length})
          </h2>

          {movies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Film className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No movies acquired yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {teamMovies?.map((tm) => {
                if (!tm.movie) return null;
                return (
                  <div key={tm.id} className="relative">
                    <MovieCard movie={tm.movie} showOwner={false} />
                    <div className="absolute top-2 right-2">
                      <Badge variant="purple">
                        {getMonthName(tm.auction?.for_month || tm.movie.release_month)} - {formatCurrency(tm.winning_bid)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-gray-600 min-w-0">
        <span className="flex-shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <span className="font-semibold text-gray-900 flex-shrink-0">{value}</span>
    </div>
  );
}
