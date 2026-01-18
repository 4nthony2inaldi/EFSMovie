'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatScore, formatBoxOffice } from '@/lib/scoring';
import { getScoreTier, MONTH_NAMES } from '@/types';
import type { Movie } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Film, Calendar, Star, Trophy } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  ownerName?: string | null;
  showOwner?: boolean;
}

export function MovieCard({ movie, ownerName, showOwner = true }: MovieCardProps) {
  const scoreTier = getScoreTier(movie.calculated_score);

  return (
    <Link
      href={`/movies/${movie.id}`}
      className="block w-full max-w-full bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
    >
      <div className="flex w-full">
        {/* Poster */}
        <div className="w-20 sm:w-24 h-32 sm:h-36 bg-gray-200 flex-shrink-0">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-3 sm:p-4 min-w-0 overflow-hidden">
          <h3 className="font-semibold text-gray-900 truncate mb-1 text-sm sm:text-base">{movie.title}</h3>

          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 mb-1.5 sm:mb-2">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
            <span className="truncate">{MONTH_NAMES[movie.release_month]} {movie.release_year}</span>
          </div>

          {movie.genre && (
            <p className="text-xs text-gray-500 mb-1.5 sm:mb-2 truncate">{movie.genre}</p>
          )}

          {showOwner && (
            <div className="mb-1.5 sm:mb-2">
              {ownerName ? (
                <Badge variant="purple">{ownerName}</Badge>
              ) : (
                <Badge variant="gray">Unowned</Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs">
            {movie.domestic_box_office > 0 && (
              <span className="text-gray-600">
                {formatBoxOffice(movie.domestic_box_office)}
              </span>
            )}
            {movie.metacritic_score && (
              <span className="flex items-center gap-0.5 text-gray-600">
                <Star className="h-3 w-3 text-gold-500" />
                {movie.metacritic_score}
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div
          className={cn(
            'w-12 sm:w-16 flex flex-col items-center justify-center text-center flex-shrink-0',
            scoreTier === 'gold' && 'bg-gold-200',
            scoreTier === 'purple' && 'bg-purple-100',
            scoreTier === 'white' && 'bg-gray-100',
            scoreTier === 'gray' && 'bg-gray-50'
          )}
        >
          <span className="text-base sm:text-lg font-bold">{formatScore(movie.calculated_score)}</span>
          <span className="text-xs text-gray-600">pts</span>
        </div>
      </div>
    </Link>
  );
}
