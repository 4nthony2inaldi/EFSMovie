'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { formatScore, formatBoxOffice } from '@/lib/scoring';
import { getScoreTier } from '@/types';
import type { TeamStanding, Movie, TeamMovie } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import { Trophy, Medal, Award } from 'lucide-react';

interface TeamWithMovies extends TeamStanding {
  movies: (TeamMovie & { movie: Movie })[];
}

interface StandingsTableProps {
  standings: TeamWithMovies[];
}

export function StandingsTable({ standings }: StandingsTableProps) {
  // Find max movies to determine row count
  const maxMovies = Math.max(...standings.map((t) => t.movies.length), 0);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${standings.length}, minmax(200px, 1fr))` }}>
          {/* Team Headers */}
          {standings.map((team, index) => (
            <div key={team.team_id} className="bg-white rounded-t-xl border border-gray-200 overflow-hidden">
              <Link href={`/teams/${team.team_id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <Avatar name={team.team_name} src={team.photo_url} size="lg" />
                    {index < 3 && (
                      <div className={cn(
                        'absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center',
                        index === 0 ? 'bg-gold-500' : index === 1 ? 'bg-gray-300' : 'bg-amber-600'
                      )}>
                        {index === 0 ? (
                          <Trophy className="h-3 w-3 text-gold-900" />
                        ) : index === 1 ? (
                          <Medal className="h-3 w-3 text-gray-700" />
                        ) : (
                          <Award className="h-3 w-3 text-amber-900" />
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">{team.team_name}</h3>
                    <p className="text-sm text-gray-500">Rank #{team.rank}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Points</span>
                    <span className="font-bold text-purple-600">{formatScore(team.total_points)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Points Back</span>
                    <span className={team.points_back === 0 ? 'text-gold-600 font-medium' : 'text-gray-700'}>
                      {team.points_back === 0 ? '-' : formatScore(team.points_back)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget</span>
                    <span className="text-gray-700">{formatCurrency(team.budget_remaining)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Movies</span>
                    <span className="text-gray-700">{team.movies_owned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Box Office</span>
                    <span className="text-gray-700">{formatBoxOffice(team.total_box_office)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Theaters</span>
                    <span className="text-gray-700">{formatNumber(team.avg_theaters)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Rating</span>
                    <span className="text-gray-700">{team.avg_rating.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Oscar Points</span>
                    <span className="text-gold-600 font-medium">{formatScore(team.oscar_points)}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}

          {/* Movie Grid */}
          {Array.from({ length: maxMovies }).map((_, rowIndex) => (
            standings.map((team) => {
              const movieEntry = team.movies[rowIndex];
              if (!movieEntry) {
                return <div key={`${team.team_id}-${rowIndex}`} className="bg-white border-x border-gray-200 p-2 min-h-[60px]" />;
              }

              const movie = movieEntry.movie;
              const scoreTier = getScoreTier(movie.calculated_score);
              const scoreClasses = {
                gold: 'bg-gold-200 text-gold-900 border-gold-300',
                purple: 'bg-purple-100 text-purple-900 border-purple-200',
                white: 'bg-gray-100 text-gray-700 border-gray-200',
                gray: 'bg-gray-50 text-gray-500 border-gray-100',
              };

              return (
                <Link
                  key={`${team.team_id}-${rowIndex}`}
                  href={`/movies/${movie.id}`}
                  className={cn(
                    'border-x border-b p-2 transition-all hover:scale-[1.02] hover:shadow-md',
                    scoreClasses[scoreTier]
                  )}
                >
                  <div className="flex items-center gap-2">
                    {movie.poster_url && (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-8 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{movie.title}</p>
                      <p className="text-xs font-bold">{formatScore(movie.calculated_score)} pts</p>
                    </div>
                  </div>
                </Link>
              );
            })
          ))}

          {/* Bottom border */}
          {standings.map((team) => (
            <div key={`bottom-${team.team_id}`} className="bg-white rounded-b-xl border-x border-b border-gray-200 h-2" />
          ))}
        </div>
      </div>
    </div>
  );
}
