'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronUp,
  ChevronDown,
  GripVertical,
  Film,
  RotateCcw,
  Info,
} from 'lucide-react';
import type { Movie } from '@/types';

interface BidPriorityManagerProps {
  bids: Map<string, number>;
  priorities: Map<string, number>;
  movies: Movie[];
  onPrioritiesChange: (priorities: Map<string, number>) => void;
  className?: string;
}

interface BidItem {
  movieId: string;
  movie: Movie;
  amount: number;
  priority: number;
}

export function BidPriorityManager({
  bids,
  priorities,
  movies,
  onPrioritiesChange,
  className,
}: BidPriorityManagerProps) {
  // Build sorted list of bids with their movies
  const [bidItems, setBidItems] = useState<BidItem[]>([]);

  useEffect(() => {
    const movieMap = new Map(movies.map((m) => [m.id, m]));

    // Get all non-zero bids
    const items: BidItem[] = [];
    bids.forEach((amount, movieId) => {
      if (amount > 0) {
        const movie = movieMap.get(movieId);
        if (movie) {
          items.push({
            movieId,
            movie,
            amount,
            priority: priorities.get(movieId) ?? 0,
          });
        }
      }
    });

    // Sort by priority (if set), then by amount descending
    items.sort((a, b) => {
      // If both have explicit priorities, use those
      if (a.priority > 0 && b.priority > 0) {
        return a.priority - b.priority;
      }
      // If only one has priority, it comes first
      if (a.priority > 0) return -1;
      if (b.priority > 0) return 1;
      // Otherwise sort by amount (highest first)
      return b.amount - a.amount;
    });

    setBidItems(items);
  }, [bids, priorities, movies]);

  // Check if current order matches default (by amount)
  const isDefaultOrder = () => {
    const sortedByAmount = [...bidItems].sort((a, b) => b.amount - a.amount);
    return bidItems.every((item, i) => item.movieId === sortedByAmount[i].movieId);
  };

  // Reset to default order (by amount)
  const resetToDefault = () => {
    onPrioritiesChange(new Map());
  };

  // Move item up
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...bidItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    updatePriorities(newItems);
  };

  // Move item down
  const moveDown = (index: number) => {
    if (index === bidItems.length - 1) return;
    const newItems = [...bidItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    updatePriorities(newItems);
  };

  // Update priorities based on new order
  const updatePriorities = (items: BidItem[]) => {
    const newPriorities = new Map<string, number>();
    items.forEach((item, index) => {
      newPriorities.set(item.movieId, index + 1);
    });
    onPrioritiesChange(newPriorities);
  };

  // Handle drag start
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...bidItems];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setBidItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      updatePriorities(bidItems);
    }
    setDraggedIndex(null);
  };

  if (bidItems.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-purple-200 bg-purple-50/30", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Bid Priority</h3>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 top-6 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                Priority determines which movies you prefer to win if you&apos;re the high bidder on more than 2 movies. Drag to reorder.
              </div>
            </div>
          </div>
          {!isDefaultOrder() && (
            <button
              onClick={resetToDefault}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        <div className="space-y-1">
          {bidItems.map((item, index) => (
            <div
              key={item.movieId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-2 p-2 bg-white rounded-lg border transition-all cursor-move",
                draggedIndex === index
                  ? "border-purple-400 shadow-lg opacity-90"
                  : "border-gray-200 hover:border-purple-300"
              )}
            >
              {/* Drag Handle */}
              <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />

              {/* Priority Number */}
              <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </div>

              {/* Movie Poster */}
              <div className="w-8 h-12 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                {item.movie.poster_url ? (
                  <img
                    src={item.movie.poster_url}
                    alt={item.movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="h-3 w-3 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Movie Title */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {item.movie.title}
                </div>
              </div>

              {/* Bid Amount */}
              <Badge variant="purple" className="flex-shrink-0">
                {formatCurrency(item.amount)}
              </Badge>

              {/* Up/Down Buttons */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className={cn(
                    "p-0.5 rounded transition-colors",
                    index === 0
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:text-purple-600 hover:bg-purple-100"
                  )}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === bidItems.length - 1}
                  className={cn(
                    "p-0.5 rounded transition-colors",
                    index === bidItems.length - 1
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:text-purple-600 hover:bg-purple-100"
                  )}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {bidItems.length > 2 && (
          <p className="text-xs text-gray-500 mt-3">
            You have {bidItems.length} bids but can only win 2 movies.
            Order by preference to control which ones you win.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
