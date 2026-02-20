'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatScore } from '@/lib/scoring';
import { getScoreTier } from '@/types';
import type { TeamStanding, Movie, TeamMovie } from '@/types';
import { Share2, X, Trophy, Medal, Award } from 'lucide-react';

interface TeamWithMovies extends TeamStanding {
  movies: (TeamMovie & { movie: Movie })[];
}

interface StandingsReportProps {
  standings: TeamWithMovies[];
  leagueName: string;
  seasonYear: number;
}

export function StandingsReport({ standings, leagueName, seasonYear }: StandingsReportProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
      >
        <Share2 className="h-4 w-4" />
        Share Report
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/50 flex items-start justify-center p-4">
      <div className="relative w-full max-w-[375px] my-8">
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute -top-2 -right-2 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* Report content - optimized for iPhone screenshot */}
        <div id="standings-report" className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Compact Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-white">
            <h1 className="text-lg font-bold leading-tight">{leagueName}</h1>
            <p className="text-purple-200 text-xs">{seasonYear} Season Standings</p>
          </div>

          {/* Compact Standings List */}
          <div className="p-3">
            <div className="space-y-2">
              {standings.map((team, index) => {
                const RankIcon = index === 0 ? Trophy : index === 1 ? Medal : index === 2 ? Award : null;

                return (
                  <div
                    key={team.team_id}
                    className={cn(
                      'rounded-lg border overflow-hidden',
                      index === 0 ? 'border-gold-300 bg-gold-50' :
                      index === 1 ? 'border-gray-300 bg-gray-50' :
                      index === 2 ? 'border-amber-300 bg-amber-50' :
                      'border-gray-200 bg-white'
                    )}
                  >
                    {/* Team row */}
                    <div className="px-3 py-2 flex items-center gap-2">
                      {/* Rank */}
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0',
                        index === 0 ? 'bg-gold-400 text-gold-900' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-400 text-amber-900' :
                        'bg-gray-200 text-gray-600'
                      )}>
                        {RankIcon ? <RankIcon className="h-3 w-3" /> : team.rank}
                      </div>

                      {/* Team name */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{team.team_name}</p>
                      </div>

                      {/* Points */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-purple-600 leading-none">{formatScore(team.total_points)}</p>
                        <p className="text-[10px] text-gray-400">pts</p>
                      </div>
                    </div>

                    {/* Movies - compact inline list */}
                    {team.movies.length > 0 && (
                      <div className="px-3 pb-2 flex flex-wrap gap-1">
                        {team.movies.map((entry) => {
                          const movie = entry.movie;
                          const scoreTier = getScoreTier(movie.calculated_score);
                          const tierColors = {
                            gold: 'bg-gold-200 text-gold-800',
                            purple: 'bg-purple-200 text-purple-800',
                            white: 'bg-gray-200 text-gray-700',
                            gray: 'bg-gray-100 text-gray-500',
                          };

                          return (
                            <span
                              key={entry.id}
                              className={cn(
                                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                                tierColors[scoreTier]
                              )}
                            >
                              <span className="truncate max-w-[80px]">{movie.title}</span>
                              <span className="font-bold">{formatScore(movie.calculated_score)}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Compact Footer */}
            <div className="mt-3 pt-2 border-t border-gray-100 text-center text-[10px] text-gray-400">
              Fantasy Movie League
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-3 text-center text-white text-xs">
          <p>Screenshot the report above to share!</p>
        </div>
      </div>
    </div>
  );
}
