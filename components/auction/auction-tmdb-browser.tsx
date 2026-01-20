'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Film,
  Loader2,
  Plus,
  X,
  Search,
  Globe,
  Check,
  AlertCircle,
} from 'lucide-react';

interface TMDBMovie {
  tmdb_id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_url: string | null;
  backdrop_url: string | null;
  genre: string;
  popularity: number;
  vote_average: number;
}

interface AuctionTmdbBrowserProps {
  auctionId: string;
  forMonth: number;
  forYear: number;
  existingTmdbIds: number[];
  userAddedCount: number;
  maxUserAdditions: number;
  onMovieAdded: () => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function AuctionTmdbBrowser({
  auctionId,
  forMonth,
  forYear,
  existingTmdbIds,
  userAddedCount,
  maxUserAdditions,
  onMovieAdded,
  onClose,
}: AuctionTmdbBrowserProps) {
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set(existingTmdbIds));
  const [addError, setAddError] = useState<string | null>(null);

  const remainingAdditions = maxUserAdditions - userAddedCount;

  // Load movies from TMDB
  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          year: forYear.toString(),
          month: forMonth.toString(),
          _t: Date.now().toString(),
        });

        const response = await fetch(`/api/tmdb/upcoming?${params}`, {
          cache: 'no-store',
        });
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setMovies([]);
        } else {
          setMovies(data.movies || []);
        }
      } catch (err) {
        setError('Failed to load movies from TMDB');
      }
      setLoading(false);
    }

    loadMovies();
  }, [forMonth, forYear]);

  // Filter movies by search query and exclude already-added movies
  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
    const notAlreadyAdded = !addedIds.has(movie.tmdb_id);
    return matchesSearch && notAlreadyAdded;
  });

  // Add movie to auction
  async function addMovie(movie: TMDBMovie) {
    if (remainingAdditions <= 0) {
      setAddError(`You can only add up to ${maxUserAdditions} movies per auction`);
      return;
    }

    setAddingIds((prev) => new Set(prev).add(movie.tmdb_id));
    setAddError(null);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/add-movie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: movie.tmdb_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAddError(data.error || 'Failed to add movie');
      } else {
        setAddedIds((prev) => new Set(prev).add(movie.tmdb_id));
        onMovieAdded();
      }
    } catch (err) {
      setAddError('Network error - please try again');
    }

    setAddingIds((prev) => {
      const next = new Set(prev);
      next.delete(movie.tmdb_id);
      return next;
    });
  }

  return (
    <Card className="mb-6 border-purple-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-500" />
            Add Movies from TMDB
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Browse {MONTH_NAMES[forMonth - 1]} {forYear} movies that weren&apos;t included in the auction
        </p>
      </CardHeader>
      <CardContent>
        {/* Remaining additions indicator */}
        <div className={cn(
          "mb-4 p-3 rounded-lg flex items-center justify-between",
          remainingAdditions > 0 ? "bg-purple-50 border border-purple-200" : "bg-gray-100 border border-gray-200"
        )}>
          <div className="flex items-center gap-2">
            <Plus className={cn(
              "h-4 w-4",
              remainingAdditions > 0 ? "text-purple-600" : "text-gray-400"
            )} />
            <span className={cn(
              "text-sm font-medium",
              remainingAdditions > 0 ? "text-purple-700" : "text-gray-500"
            )}>
              {remainingAdditions > 0
                ? `You can add ${remainingAdditions} more movie${remainingAdditions !== 1 ? 's' : ''}`
                : 'You have reached the maximum additions'}
            </span>
          </div>
          <Badge variant={remainingAdditions > 0 ? "purple" : "gray"}>
            {userAddedCount} / {maxUserAdditions}
          </Badge>
        </div>

        {/* Error message */}
        {addError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {addError}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Loading movies from TMDB...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <X className="h-12 w-12 mx-auto mb-2 text-red-400" />
            <p className="text-red-600 font-medium">Error loading movies</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Film className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            {searchQuery ? (
              <p>No movies matching &quot;{searchQuery}&quot;</p>
            ) : (
              <p>All available movies are already in the auction</p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 max-h-[400px] overflow-y-auto">
            {filteredMovies.map((movie) => {
              const isAdding = addingIds.has(movie.tmdb_id);
              const canAdd = remainingAdditions > 0 && !isAdding;

              return (
                <div
                  key={movie.tmdb_id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 bg-white hover:border-purple-200 transition-colors"
                >
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-12 h-18 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center">
                      <Film className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{movie.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{movie.release_date}</span>
                      <span>•</span>
                      <Badge variant="gray">{movie.genre}</Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => addMovie(movie)}
                    disabled={!canAdd}
                    className={cn(
                      "flex items-center gap-1.5 py-1.5 px-3 text-sm rounded-lg font-medium transition-colors",
                      canAdd
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isAdding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
