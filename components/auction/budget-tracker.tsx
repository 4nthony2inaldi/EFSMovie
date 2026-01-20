'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface BudgetTrackerProps {
  totalBudget: number;
  totalBids: number;
  className?: string;
  compact?: boolean;
}

export function BudgetTracker({ totalBudget, totalBids, className, compact = false }: BudgetTrackerProps) {
  const remaining = totalBudget - totalBids;
  const isOverBudget = remaining < 0;
  const percentUsed = Math.min((totalBids / totalBudget) * 100, 100);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 text-xs', className)}>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Budget:</span>
          <span className="font-semibold">{formatCurrency(totalBudget)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Top 2:</span>
          <span className="font-semibold text-purple-600">{formatCurrency(totalBids)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Left:</span>
          <span className={cn(
            'font-bold',
            isOverBudget ? 'text-red-600' : 'text-green-600'
          )}>
            {formatCurrency(remaining)}
          </span>
        </div>
        {isOverBudget && (
          <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-6 sticky top-4',
        className
      )}
    >
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-green-600" />
        Budget Tracker
      </h3>

      {/* Progress Bar */}
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          className={cn(
            'h-full transition-all duration-300',
            isOverBudget ? 'bg-red-500' : percentUsed > 80 ? 'bg-gold-500' : 'bg-green-500'
          )}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Budget</span>
          <span className="font-semibold">{formatCurrency(totalBudget)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Max Spend (Top 2)</span>
          <span className="font-semibold text-purple-600">{formatCurrency(totalBids)}</span>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Remaining</span>
            <span
              className={cn(
                'font-bold text-lg',
                isOverBudget ? 'text-red-600' : 'text-green-600'
              )}
            >
              {formatCurrency(remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Warning/Success Message */}
      {isOverBudget && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium text-sm">Over budget!</p>
            <p className="text-red-600 text-xs">
              Reduce your bids by {formatCurrency(Math.abs(remaining))} to submit
            </p>
          </div>
        </div>
      )}

      {!isOverBudget && totalBids > 0 && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-800 font-medium text-sm">Within budget</p>
            <p className="text-green-600 text-xs">
              Your bids are automatically saved
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
