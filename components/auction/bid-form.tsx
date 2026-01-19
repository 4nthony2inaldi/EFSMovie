'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { debounce } from '@/lib/utils';
import type { Movie, Bid } from '@/types';
import { Film, Check, Loader2 } from 'lucide-react';

interface BidFormProps {
  movie: Movie;
  auctionId: string;
  teamId: string;
  existingBid?: Bid | null;
  maxBid: number;
  onBidChange: (movieId: string, amount: number) => void;
}

export function BidForm({
  movie,
  auctionId,
  teamId,
  existingBid,
  maxBid,
  onBidChange,
}: BidFormProps) {
  const supabase = createClient();
  const [amount, setAmount] = useState(existingBid?.amount?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Debounced save function
  const saveBid = debounce(async (value: number) => {
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from('bids')
      .upsert({
        auction_id: auctionId,
        team_id: teamId,
        movie_id: movie.id,
        amount: value,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'auction_id,team_id,movie_id',
      });

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, 500);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setAmount(value);

    const numValue = parseInt(value) || 0;
    if (numValue >= 0 && numValue <= maxBid) {
      onBidChange(movie.id, numValue);
      saveBid(numValue);
    }
  }

  const numAmount = parseFloat(amount) || 0;
  const isOverBudget = numAmount > maxBid;

  return (
    <div className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 p-4">
      {/* Movie Info */}
      <div className="w-12 h-18 bg-gray-200 rounded flex-shrink-0">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{movie.title}</h4>
        <p className="text-sm text-gray-500">{movie.genre || 'Unknown genre'}</p>
      </div>

      {/* Bid Input */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            min="0"
            max={maxBid}
            step="1"
            value={amount}
            onChange={handleChange}
            placeholder="0"
            className={cn(
              'w-24 pl-7 pr-3 py-2 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-purple-500',
              isOverBudget ? 'border-red-300 bg-red-50' : 'border-gray-300'
            )}
          />
        </div>

        {/* Status Indicator */}
        <div className="w-6">
          {saving && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
          {saved && <Check className="h-4 w-4 text-green-500" />}
        </div>
      </div>
    </div>
  );
}
