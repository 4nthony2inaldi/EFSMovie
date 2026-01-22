'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Bookmark, Loader2 } from 'lucide-react';

interface WatchlistButtonProps {
  movieId: string;
  initialInterested?: boolean;
  variant?: 'full' | 'icon';
  className?: string;
  onToggle?: (interested: boolean) => void;
}

export function WatchlistButton({
  movieId,
  initialInterested = false,
  variant = 'full',
  className,
  onToggle,
}: WatchlistButtonProps) {
  const [interested, setInterested] = useState(initialInterested);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setLoading(true);
    try {
      const method = interested ? 'DELETE' : 'POST';
      const response = await fetch(`/api/watchlist/${movieId}`, { method });
      const data = await response.json();

      if (response.ok) {
        const newState = data.interested;
        setInterested(newState);
        onToggle?.(newState);
      }
    } catch (error) {
      console.error('Failed to update watchlist:', error);
    } finally {
      setLoading(false);
    }
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          'p-1.5 rounded-full transition-all',
          interested
            ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600',
          loading && 'opacity-50 cursor-not-allowed',
          className
        )}
        title={interested ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bookmark className={cn('h-4 w-4', interested && 'fill-current')} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
        interested
          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        loading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bookmark className={cn('h-4 w-4', interested && 'fill-current')} />
      )}
      <span>{interested ? 'On Watchlist' : 'Add to Watchlist'}</span>
    </button>
  );
}
