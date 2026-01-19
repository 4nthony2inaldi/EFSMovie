import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { ScoreBreakdown } from '@/components/movies/score-breakdown';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatScore, formatBoxOffice, formatTheaters, formatMetacritic } from '@/lib/scoring';
import { formatDate, formatCurrency, getMonthName } from '@/lib/utils';
import { getScoreTier } from '@/types';
import {
  Film,
  Calendar,
  Clock,
  Star,
  Trophy,
  DollarSign,
  Users,
  ExternalLink,
  Play,
  ArrowLeft,
} from 'lucide-react';

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get movie
  const { data: movie } = await supabase
    .from('movies')
    .select('*')
    .eq('id', id)
    .single();

  if (!movie) {
    notFound();
  }

  // Get ownership info
  const { data: ownership } = await supabase
    .from('team_movies')
    .select(`
      *,
      team:teams(id, name),
      auction:auctions(for_month, for_year)
    `)
    .eq('movie_id', id)
    .single();

  const scoreTier = getScoreTier(movie.calculated_score);
  const scoreClasses = {
    gold: 'bg-gold-200 text-gold-900',
    purple: 'bg-purple-100 text-purple-900',
    white: 'bg-gray-100 text-gray-700',
    gray: 'bg-gray-50 text-gray-500',
  };

  return (
    <>
      <Link
        href="/movies"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Movies
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                {/* Poster */}
                <div className="w-full md:w-48 h-72 bg-gray-200 flex-shrink-0">
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {movie.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {movie.release_date
                            ? formatDate(movie.release_date)
                            : `${getMonthName(movie.release_month)} ${movie.release_year}`}
                        </span>
                        {movie.runtime_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {movie.runtime_minutes} min
                          </span>
                        )}
                        {movie.genre && (
                          <Badge variant="default">{movie.genre}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Score Badge */}
                    <div
                      className={`${scoreClasses[scoreTier]} px-4 py-2 rounded-xl text-center`}
                    >
                      <div className="text-2xl font-bold">
                        {formatScore(movie.calculated_score)}
                      </div>
                      <div className="text-xs">points</div>
                    </div>
                  </div>

                  {/* Director & Cast */}
                  {movie.director && (
                    <p className="text-gray-600 mb-2">
                      <span className="font-medium">Director:</span> {movie.director}
                    </p>
                  )}
                  {movie.cast_list && movie.cast_list.length > 0 && (
                    <p className="text-gray-600 mb-4">
                      <span className="font-medium">Cast:</span>{' '}
                      {movie.cast_list.slice(0, 5).join(', ')}
                    </p>
                  )}

                  {/* Synopsis */}
                  {movie.synopsis && (
                    <p className="text-gray-700 leading-relaxed">{movie.synopsis}</p>
                  )}

                  {/* Ownership */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {ownership ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="purple">Owned</Badge>
                        <span className="text-gray-600">by</span>
                        <Link
                          href={`/teams/${ownership.team?.id}`}
                          className="font-medium text-purple-600 hover:text-purple-700"
                        >
                          {ownership.team?.name}
                        </Link>
                        {ownership.auction && (
                          <span className="text-gray-500 text-sm">
                            ({getMonthName(ownership.auction.for_month)} auction,{' '}
                            {formatCurrency(ownership.winning_bid)})
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="gray">Unowned</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <ScoreBreakdown
            stats={{
              domesticBoxOffice: movie.domestic_box_office,
              theaterCount: movie.theater_count,
              metacriticScore: movie.metacritic_score,
              oscarNominations: movie.oscar_nominations,
              oscarWins: movie.oscar_wins,
              bestPictureNominated: movie.best_picture_nominated,
              bestPictureWon: movie.best_picture_won,
            }}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow
                icon={<DollarSign className="h-5 w-5 text-green-600" />}
                label="Box Office"
                value={formatBoxOffice(movie.domestic_box_office)}
              />
              <StatRow
                icon={<Users className="h-5 w-5 text-blue-600" />}
                label="Theaters"
                value={formatTheaters(movie.theater_count)}
              />
              <StatRow
                icon={<Star className="h-5 w-5 text-gold-500" />}
                label="Metacritic"
                value={formatMetacritic(movie.metacritic_score)}
              />
              {movie.rotten_tomatoes_score && (
                <StatRow
                  icon={<Star className="h-5 w-5 text-red-500" />}
                  label="Rotten Tomatoes"
                  value={`${movie.rotten_tomatoes_score}%`}
                />
              )}
            </CardContent>
          </Card>

          {/* Oscar Card */}
          {(movie.oscar_nominations > 0 || movie.oscar_wins > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-gold-500" />
                  Oscar Recognition
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {movie.oscar_nominations > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nominations</span>
                    <span className="font-semibold">{movie.oscar_nominations}</span>
                  </div>
                )}
                {movie.oscar_wins > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wins</span>
                    <span className="font-semibold text-gold-600">{movie.oscar_wins}</span>
                  </div>
                )}
                {movie.best_picture_nominated && (
                  <Badge variant="gold" className="mt-2">
                    Best Picture Nominee
                  </Badge>
                )}
                {movie.best_picture_won && (
                  <Badge variant="gold" className="mt-2">
                    Best Picture Winner
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Links Card */}
          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {movie.trailer_url && (
                <a
                  href={movie.trailer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
                >
                  <Play className="h-4 w-4" />
                  Watch Trailer
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {movie.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
                >
                  IMDb
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {movie.tmdb_id && (
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
                >
                  TMDB
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>
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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
