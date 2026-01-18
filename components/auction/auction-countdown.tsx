'use client';

import { useState, useEffect } from 'react';
import { getTimeRemaining } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface AuctionCountdownProps {
  targetDate: string;
  label: string;
}

export function AuctionCountdown({ targetDate, label }: AuctionCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeRemaining.total <= 0) {
    return (
      <div className="bg-purple-100 rounded-xl p-6 text-center">
        <p className="text-purple-700 font-medium">Auction has ended</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
      <div className="flex items-center gap-2 justify-center mb-4">
        <Clock className="h-5 w-5" />
        <span className="text-sm opacity-90">{label}</span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <TimeBlock value={timeRemaining.days} label="Days" />
        <TimeBlock value={timeRemaining.hours} label="Hours" />
        <TimeBlock value={timeRemaining.minutes} label="Min" />
        <TimeBlock value={timeRemaining.seconds} label="Sec" />
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="bg-white/20 rounded-lg py-3 mb-1">
        <span className="text-2xl md:text-3xl font-bold">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs opacity-80">{label}</span>
    </div>
  );
}
