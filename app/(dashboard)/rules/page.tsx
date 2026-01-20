'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MONTH_NAMES } from '@/types';
import {
  Calculator,
  DollarSign,
  Star,
  Trophy,
  TrendingUp,
  Gavel,
  Shield,
  Target,
  ArrowRight,
  Info,
  Award,
  Calendar,
} from 'lucide-react';

export default function RulesPage() {
  const supabase = createClient();
  const [seasonEndMonth, setSeasonEndMonth] = useState<number | null>(null);
  const [seasonEndYear, setSeasonEndYear] = useState<number | null>(null);

  useEffect(() => {
    async function loadLeague() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: team } = await supabase
        .from('teams')
        .select('league:leagues(season_end_month, season_end_year)')
        .eq('user_id', user.id)
        .single();

      if (team?.league) {
        const league = team.league as unknown as { season_end_month: number; season_end_year: number };
        setSeasonEndMonth(league.season_end_month);
        setSeasonEndYear(league.season_end_year);
      }
    }
    loadLeague();
  }, [supabase]);
  return (
    <>
      <Header
        title="League Rules"
        subtitle="How scoring works in EFS Movie League"
      />

      {/* Overview Banner */}
      <div className="mb-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Scoring Overview</h2>
            <p className="text-purple-100">
              Movies earn points based on their box office performance and critical reception.
              Build a roster of movies through monthly auctions and compete for the highest total score.
            </p>
          </div>
        </div>
      </div>

      {/* Main Scoring Formula */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            The Scoring Formula
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-3 text-lg sm:text-xl font-mono bg-white px-6 py-4 rounded-lg shadow-sm border border-gray-200">
                <span className="text-purple-600 font-semibold">Final Score</span>
                <span className="text-gray-400">=</span>
                <span className="text-gray-700">Base Score</span>
                <span className="text-gray-400">+</span>
                <span className="text-gold-600">Oscar Points</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Base Score */}
            <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
              <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Base Score
              </h4>
              <div className="bg-white rounded-lg p-4 font-mono text-sm mb-3">
                <div className="text-gray-600">Box Office Component × Metacritic %</div>
              </div>
              <p className="text-sm text-purple-700">
                Combines box office performance with critical reception
              </p>
            </div>

            {/* Oscar Points */}
            <div className="bg-gold-50 rounded-xl p-5 border border-gold-200">
              <h4 className="font-semibold text-gold-900 mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Oscar Points
              </h4>
              <div className="bg-white rounded-lg p-4 font-mono text-sm mb-3">
                <div className="text-gray-600">Nominations + Wins + Best Picture Bonuses</div>
              </div>
              <p className="text-sm text-gold-700">
                Bonus points for Academy Award recognition
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Box Office Component */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Box Office Component
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-base sm:text-lg font-mono bg-white px-6 py-4 rounded-lg shadow-sm border border-green-200">
                <span className="text-green-600 font-semibold whitespace-nowrap">Box Office Component</span>
                <span className="text-gray-400">=</span>
                <span className="text-gray-700 whitespace-nowrap">($ ÷ Theaters) ÷ 1000</span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">$15M</div>
              <div className="text-sm text-gray-600">Box Office</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">3,500</div>
              <div className="text-sm text-gray-600">Theaters</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">4.29</div>
              <div className="text-sm text-gray-600">Component</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-800 font-medium mb-1">
                <Info className="h-4 w-4" />
                Theater Minimum
              </div>
              <p className="text-sm text-amber-700">
                Movies must be in <strong>5+ theaters</strong> to earn box office points
              </p>
            </div>
            <div className="flex-1 bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 text-red-800 font-medium mb-1">
                <TrendingUp className="h-4 w-4" />
                Maximum Cap
              </div>
              <p className="text-sm text-red-700">
                Box office component is <strong>capped at 15</strong> to prevent runaway scores
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metacritic Multiplier */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-blue-600" />
            Metacritic Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-3 text-lg font-mono bg-white px-6 py-4 rounded-lg shadow-sm border border-blue-200">
                <span className="text-blue-600 font-semibold">Base Score</span>
                <span className="text-gray-400">=</span>
                <span className="text-green-600">4.29</span>
                <span className="text-gray-400">×</span>
                <span className="text-blue-600">80%</span>
                <span className="text-gray-400">=</span>
                <span className="text-purple-600 font-bold">3.43</span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <MetacriticExample score={90} label="Excellent" color="green" />
            <MetacriticExample score={70} label="Good" color="blue" />
            <MetacriticExample score={50} label="Average" color="amber" />
          </div>
        </CardContent>
      </Card>

      {/* Floor Rule */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            The Floor Rule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-purple-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">If Base Score</div>
                <div className="text-2xl font-bold text-red-500">0.40</div>
              </div>
              <div className="text-gray-400 text-2xl">&lt;</div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Metacritic Floor</div>
                <div className="text-2xl font-bold text-blue-600">0.80</div>
              </div>
              <ArrowRight className="h-6 w-6 text-gray-400" />
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Use Floor</div>
                <div className="text-2xl font-bold text-green-600">0.80</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700">
              <strong>Why the floor?</strong> This rule ensures that critically acclaimed movies
              still earn meaningful points even if they have limited theatrical releases.
              A movie with 80% Metacritic will never score below 0.80 points.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Oscar Points */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-gold-600" />
            Oscar Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Achievement</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      Each Nomination
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gray-700">+0.5</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gold-500" />
                      Each Win
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gold-600">+1.0</td>
                </tr>
                <tr className="bg-gold-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-gold-600" />
                      Best Picture Nomination
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gold-600">+1.0 <span className="text-xs text-gray-500">(doubled)</span></td>
                </tr>
                <tr className="bg-gold-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-gold-600" />
                      Best Picture Win
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gold-600">+2.0 <span className="text-xs text-gray-500">(doubled)</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-gold-50 rounded-lg p-4 border border-gold-200">
            <p className="text-sm text-gold-800">
              <strong>Example:</strong> A movie with 5 nominations and 2 wins earns:
              (5 × 0.5) + (2 × 1.0) = <strong>4.5 Oscar points</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Season Info */}
      {seasonEndMonth && seasonEndYear && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Season Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-purple-50 rounded-xl p-6 text-center">
              <div className="text-sm text-purple-600 font-medium mb-1">Final Auction Month</div>
              <div className="text-3xl font-bold text-purple-900">
                {MONTH_NAMES[seasonEndMonth]} {seasonEndYear}
              </div>
              <p className="text-sm text-purple-700 mt-2">
                Plan your budget to last through all auctions until this date.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auction System */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-purple-600" />
            The Auction System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <AuctionStep
                number={1}
                title="Monthly Auctions"
                description="Each month, movies releasing that month are available to bid on"
              />
              <AuctionStep
                number={2}
                title="Blind Bidding"
                description="Teams secretly place bids on movies they want using their budget"
              />
              <AuctionStep
                number={3}
                title="Win Up to 2"
                description="Each team can win a maximum of 2 movies per auction"
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3">Bidding Rules</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                  Winning bids are deducted from your remaining budget
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                  Minimum bid is <strong>$1</strong> per movie
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                  You can bid on as many movies as you want, but can only win 2
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-3">Tie-Breaking Rules</h4>
              <p className="text-sm text-amber-800 mb-3">When two or more teams bid the same amount:</p>
              <ol className="space-y-2 text-sm text-amber-800 list-decimal list-inside">
                <li><strong>Lower-ranked team wins</strong> - The team in the worse standings position gets the movie (helps underdogs catch up)</li>
                <li><strong>Random selection</strong> - If teams are tied in standings too (e.g., at season start), a random winner is chosen</li>
              </ol>
            </div>

            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">Auto-Assignment</h4>
              <p className="text-sm text-blue-800">
                If you don&apos;t submit any bids for an auction, you&apos;ll be automatically assigned up to 2 random unowned movies at a small cost. This ensures every team stays active in the competition!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            Full Example
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Sample Movie Calculation</h4>

            <div className="space-y-4 font-mono text-sm">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-gray-500 mb-1">Box Office Component</div>
                <div className="text-gray-800">
                  ($50,000,000 ÷ 4,000 theaters) ÷ 1000 = <span className="text-green-600 font-semibold">12.5</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-gray-500 mb-1">Base Score</div>
                <div className="text-gray-800">
                  12.5 × 85% = <span className="text-purple-600 font-semibold">10.63</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-gray-500 mb-1">Floor Check</div>
                <div className="text-gray-800">
                  10.63 ≥ 0.85 <span className="text-green-600">(no floor needed)</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-gray-500 mb-1">Oscar Points</div>
                <div className="text-gray-800">
                  3 nominations × 0.5 = <span className="text-gold-600 font-semibold">1.5</span>
                </div>
              </div>

              <div className="bg-purple-600 rounded-lg p-4 text-white">
                <div className="text-purple-200 mb-1">Final Score</div>
                <div className="text-2xl font-bold">
                  10.63 + 1.5 = 12.13 points
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function MetacriticExample({ score, label, color }: { score: number; label: string; color: string }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <div className={`rounded-lg p-4 border text-center ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-3xl font-bold mb-1">{score}%</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs mt-1 opacity-75">×{(score / 100).toFixed(2)} multiplier</div>
    </div>
  );
}

function AuctionStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold mx-auto mb-3">
        {number}
      </div>
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
