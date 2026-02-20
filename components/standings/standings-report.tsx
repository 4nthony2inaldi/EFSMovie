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
      <div className="relative w-full max-w-4xl my-8">
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute -top-2 -right-2 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* Report content - screenshot this part */}
        <div id="standings-report" className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 text-white">
            <h1 className="text-2xl font-bold">{leagueName}</h1>
            <p className="text-purple-100 mt-1">{seasonYear} Season Standings</p>
          </div>

          {/* Standings */}
          <div className="p-6">
            <div className="space-y-4">
              {standings.map((team, index) => (
                <div
                  key={team.team_id}
                  className={cn(
                    'rounded-lg border-2 overflow-hidden',
                    index === 0 ? 'border-gold-400 bg-gold-50' :
                    index === 1 ? 'border-gray-300 bg-gray-50' :
                    index === 2 ? 'border-amber-400 bg-amber-50' :
                    'border-gray-200 bg-white'
                  )}
                >
                  {/* Team header */}
                  <div className={cn(
                    'px-4 py-3 flex items-center gap-3',
                    index === 0 ? 'bg-gold-100' :
                    index === 1 ? 'bg-gray-100' :
                    index === 2 ? 'bg-amber-100' :
                    'bg-gray-50'
                  )}>
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                      index === 0 ? 'bg-gold-500 text-gold-900' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-amber-500 text-amber-900' :
                      'bg-gray-300 text-gray-700'
                    )}>
                      {index === 0 ? <Trophy className="h-4 w-4" /> :
                       index === 1 ? <Medal className="h-4 w-4" /> :
                       index === 2 ? <Award className="h-4 w-4" /> :
                       team.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{team.team_name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">{formatScore(team.total_points)}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>

                  {/* Movies */}
                  {team.movies.length > 0 && (
                    <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {team.movies.map((entry) => {
                        const movie = entry.movie;
                        const scoreTier = getScoreTier(movie.calculated_score);
                        const tierColors = {
                          gold: 'bg-gold-100 text-gold-800 border-gold-200',
                          purple: 'bg-purple-100 text-purple-800 border-purple-200',
                          white: 'bg-gray-100 text-gray-700 border-gray-200',
                          gray: 'bg-gray-50 text-gray-500 border-gray-100',
                        };

                        return (
                          <div
                            key={entry.id}
                            className={cn(
                              'px-2 py-1.5 rounded border text-xs',
                              tierColors[scoreTier]
                            )}
                          >
                            <p className="font-medium truncate" title={movie.title}>
                              {movie.title}
                            </p>
                            <p className="font-bold">{formatScore(movie.calculated_score)} pts</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {team.movies.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-400 italic">
                      No movies yet
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
              Generated from Fantasy Movie League
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center text-white text-sm">
          <p>Take a screenshot of the report above to share with your league!</p>
        </div>
      </div>
    </div>
  );
}
