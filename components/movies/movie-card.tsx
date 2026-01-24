'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatScore, formatBoxOffice, formatMetacritic } from '@/lib/scoring';
import { getScoreTier, MONTH_NAMES } from '@/types';
import type { Movie, ReleaseType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { WatchlistButton } from '@/components/movies/watchlist-button';
import { Film, Calendar, Star, Building2 } from 'lucide-react';

// Format theater count compactly (e.g., "3.5K")
function formatTheaters(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

const RELEASE_TYPE_CONFIG: Record<ReleaseType, { label: string; className: string }> = {
  wide: { label: 'Wide', className: 'text-green-600' },
  limited: { label: 'Limited', className: 'text-blue-600' },
  streaming: { label: 'Streaming', className: 'text-purple-600' },
  unknown: { label: '', className: '' },
};

interface MovieCardProps {
  movie: Movie;
  ownerName?: string | null;
  showOwner?: boolean;
  isOnWatchlist?: boolean;
  showWatchlistButton?: boolean;
}

export function MovieCard({ movie, ownerName, showOwner = true, isOnWatchlist = false, showWatchlistButton = true }: MovieCardProps) {
  const scoreTier = getScoreTier(movie.calculated_score);

  // Calculate achievement indicators
  const theaterCount = movie.theater_count || 0;
  const boxOffice = movie.domestic_box_office || 0;
  const metacriticDecimal = movie.metacritic_score || 0;
  const metacritic = metacriticDecimal * 100; // Convert to 0-100 scale

  // Check if maxed out per-theater revenue ($15k/theater cap)
  const perTheaterRevenue = theaterCount >= 5 ? (boxOffice / theaterCount) / 1000 : 0;
  const isMaxedPerTheater = perTheaterRevenue >= 15;

  // Check if raw score beat the metacritic floor
  const boxOfficeComponent = theaterCount >= 5 ? Math.min(perTheaterRevenue, 15) : 0;
  const rawBaseScore = boxOfficeComponent * metacritic;
  const beatFloor = metacritic > 0 && rawBaseScore >= metacritic;

  // Check if critic score is from metacritic or a fallback
  const isRealMetacritic = movie.metacritic_source === 'metacritic';
  const isUserScore = movie.metacritic_source === 'user';
  const isPlaceholder = movie.metacritic_source === 'placeholder' || (!movie.metacritic_source && movie.metacritic_score);

  // Determine card background style
  // Gold tint = hit box office cap, Grey = hasn't beat floor yet
  const cardBgClass = isMaxedPerTheater
    ? 'bg-gradient-to-r from-amber-50 via-yellow-50 to-white border-amber-200'
    : !beatFloor && metacritic > 0
    ? 'bg-gray-100 border-gray-300 opacity-75'
    : 'bg-white border-gray-200';

  return (
    <Link
      href={`/movies/${movie.id}`}
      className={cn(
        "block w-full max-w-full rounded-xl border overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1",
        cardBgClass
      )}
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

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5 sm:mb-2">
            {movie.genre && <span className="truncate">{movie.genre}</span>}
            {movie.release_type && movie.release_type !== 'unknown' && (
              <>
                {movie.genre && <span>•</span>}
                <span className={RELEASE_TYPE_CONFIG[movie.release_type].className}>
                  {RELEASE_TYPE_CONFIG[movie.release_type].label}
                </span>
              </>
            )}
          </div>

          {showOwner && (
            <div className="mb-1.5 sm:mb-2">
              {ownerName ? (
                <Badge variant="purple">{ownerName}</Badge>
              ) : (
                <Badge variant="gray">Unowned</Badge>
              )}
            </div>
          )}

          {/* Stats: money → theaters → critic */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
            {movie.domestic_box_office > 0 && (
              <span className="text-gray-600">
                {formatBoxOffice(movie.domestic_box_office)}
              </span>
            )}
            {theaterCount > 0 && (
              <>
                {movie.domestic_box_office > 0 && <span className="text-gray-400">→</span>}
                <span className="flex items-center gap-0.5 text-gray-600">
                  <Building2 className="h-3 w-3" />
                  {formatTheaters(theaterCount)}
                </span>
              </>
            )}
            {movie.metacritic_score && (
              <>
                {(movie.domestic_box_office > 0 || theaterCount > 0) && <span className="text-gray-400">→</span>}
                <span
                  className={cn(
                    "flex items-center gap-0.5",
                    isRealMetacritic ? "text-gray-600" : "text-yellow-600"
                  )}
                  title={
                    isRealMetacritic
                      ? "Metacritic score"
                      : isUserScore
                      ? "User score (no critic reviews yet)"
                      : "Placeholder score (awaiting reviews)"
                  }
                >
                  <Star className="h-3 w-3 text-gold-500" />
                  {formatMetacritic(movie.metacritic_score)}
                  {!isRealMetacritic && <span className="text-yellow-600">*</span>}
                </span>
              </>
            )}
            {/* Watchlist button */}
            {showWatchlistButton && (
              <WatchlistButton
                movieId={movie.id}
                initialInterested={isOnWatchlist}
                variant="icon"
                className="ml-auto"
              />
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
