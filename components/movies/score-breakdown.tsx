'use client';

import { calculateMovieScore, type MovieStats } from '@/lib/scoring';
import { formatScore, formatBoxOffice, formatTheaters } from '@/lib/scoring';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ScoreBreakdownProps {
  stats: MovieStats;
}

export function ScoreBreakdown({ stats }: ScoreBreakdownProps) {
  const breakdown = calculateMovieScore(stats);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 font-mono text-sm">
          {/* Box Office Component */}
          <div className="space-y-1">
            <div className="text-gray-600">Box Office Component</div>
            <div className="bg-gray-50 rounded-lg p-3">
              {stats.theaterCount >= 5 ? (
                <>
                  <div className="text-gray-700">
                    ({formatBoxOffice(stats.domesticBoxOffice)} / {formatTheaters(stats.theaterCount)} theaters) / 1000
                  </div>
                  <div className="text-gray-700">
                    = {((stats.domesticBoxOffice / stats.theaterCount) / 1000).toFixed(3)}
                    {breakdown.boxOfficeComponent === 15 && (
                      <span className="text-purple-600"> → capped at 15</span>
                    )}
                  </div>
                  <div className="font-semibold text-purple-600">
                    = {breakdown.boxOfficeComponent.toFixed(3)}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <AlertCircle className="h-4 w-4" />
                  Must be in 5+ theaters (currently {stats.theaterCount})
                </div>
              )}
            </div>
          </div>

          {/* Base Score */}
          <div className="space-y-1">
            <div className="text-gray-600">Base Score</div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-700">
                {breakdown.boxOfficeComponent.toFixed(3)} × {breakdown.metacriticScore.toFixed(0)}% (Metacritic)
              </div>
              <div className="font-semibold text-purple-600">
                = {breakdown.rawBaseScore.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Floor Rule */}
          <div className="space-y-1">
            <div className="text-gray-600">Floor Rule Check</div>
            <div className="bg-gray-50 rounded-lg p-3">
              {breakdown.floorApplied ? (
                <div className="flex items-center gap-2 text-gold-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Base score ({breakdown.rawBaseScore.toFixed(2)}) &lt; Metacritic floor ({(breakdown.metacriticScore / 100).toFixed(2)})</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Base score ({breakdown.rawBaseScore.toFixed(2)}) ≥ Metacritic floor ({(breakdown.metacriticScore / 100).toFixed(2)})</span>
                </div>
              )}
              <div className="font-semibold text-purple-600 mt-1">
                Adjusted Base Score = {breakdown.baseScore.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Oscar Points */}
          <div className="space-y-1">
            <div className="text-gray-600">Oscar Points</div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {stats.oscarNominations > 0 && (
                <div className="text-gray-700">
                  {stats.oscarNominations} nominations × 0.5 = +{breakdown.oscarNomPoints.toFixed(1)}
                </div>
              )}
              {stats.oscarWins > 0 && (
                <div className="text-gray-700">
                  {stats.oscarWins} wins × 1.0 = +{breakdown.oscarWinPoints.toFixed(1)}
                </div>
              )}
              {stats.bestPictureNominated && (
                <div className="text-gold-600">
                  Best Picture nomination bonus = +{breakdown.bestPictureNomBonus.toFixed(1)}
                </div>
              )}
              {stats.bestPictureWon && (
                <div className="text-gold-600">
                  Best Picture win bonus = +{breakdown.bestPictureWinBonus.toFixed(1)}
                </div>
              )}
              {breakdown.totalOscarPoints === 0 && (
                <div className="text-gray-500">No Oscar points yet</div>
              )}
              <div className="font-semibold text-gold-600">
                Total Oscar Points = {breakdown.totalOscarPoints.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Final Score */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-semibold">Final Score</span>
              <span className="text-2xl font-bold text-purple-600">
                {breakdown.finalScore.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {breakdown.baseScore.toFixed(2)} (base) + {breakdown.totalOscarPoints.toFixed(1)} (Oscars)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
