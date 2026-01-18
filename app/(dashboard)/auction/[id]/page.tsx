'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BudgetTracker } from '@/components/auction/budget-tracker';
import { AuctionCountdown } from '@/components/auction/auction-countdown';
import { formatCurrency, getMonthName, formatDate } from '@/lib/utils';
import { formatScore } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import type { Auction, Movie, Bid, Team } from '@/types';
import {
  ArrowLeft,
  Film,
  Check,
  Loader2,
  DollarSign,
  Trophy,
  AlertTriangle,
} from 'lucide-react';

export default function AuctionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const auctionId = params.id;
  const [auction, setAuction] = useState<Auction | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [bids, setBids] = useState<Map<string, number>>(new Map());
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<any[] | null>(null);

  // Load auction data
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Get current user and team
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!teamData) return;
      setTeam(teamData);

      // Get auction
      const { data: auctionData } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      if (!auctionData) return;
      setAuction(auctionData);

      // Get auction movies
      const { data: auctionMovies } = await supabase
        .from('auction_movies')
        .select('movie:movies(*)')
        .eq('auction_id', auctionId);

      const movieList = (auctionMovies || [])
        .map((am) => (am as unknown as { movie: Movie }).movie)
        .filter((m): m is Movie => m != null);
      setMovies(movieList);

      // Get existing bids
      const { data: existingBids } = await supabase
        .from('bids')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('team_id', teamData.id);

      const bidMap = new Map<string, number>();
      existingBids?.forEach((bid) => {
        bidMap.set(bid.movie_id, bid.amount);
      });
      setBids(bidMap);

      // If resolved, get results
      if (auctionData.status === 'resolved') {
        const { data: allBids } = await supabase
          .from('bids')
          .select(`
            *,
            team:teams(id, name)
          `)
          .eq('auction_id', auctionId);

        const { data: teamMovies } = await supabase
          .from('team_movies')
          .select(`
            *,
            team:teams(id, name)
          `)
          .eq('auction_id', auctionId);

        // Build results
        const resultsData = movieList.map((movie) => {
          const ownership = teamMovies?.find((tm) => tm.movie_id === movie.id);
          const yourBid = existingBids?.find((b) => b.movie_id === movie.id);

          return {
            movie,
            winner: ownership?.team || null,
            winning_bid: ownership?.winning_bid || 0,
            your_bid: yourBid?.amount || null,
            status: ownership
              ? ownership.team_id === teamData.id
                ? 'won'
                : 'outbid'
              : yourBid
                ? 'unowned'
                : 'no_bid',
          };
        });

        setResults(resultsData);
      }

      setLoading(false);
    }

    loadData();
  }, [auctionId, supabase, router]);

  // Save bid
  const saveBid = useCallback(async (movieId: string, amount: number) => {
    if (!team || !auctionId) return;

    setSaving((prev) => new Set(prev).add(movieId));

    await supabase
      .from('bids')
      .upsert({
        auction_id: auctionId,
        team_id: team.id,
        movie_id: movieId,
        amount,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'auction_id,team_id,movie_id',
      });

    setTimeout(() => {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(movieId);
        return next;
      });
    }, 500);
  }, [team, auctionId, supabase]);

  // Handle bid change
  const handleBidChange = (movieId: string, amount: number) => {
    setBids((prev) => {
      const next = new Map(prev);
      next.set(movieId, amount);
      return next;
    });
    saveBid(movieId, amount);
  };

  if (loading || !auction) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  const totalBids = Array.from(bids.values()).reduce((sum, b) => sum + b, 0);
  const isOverBudget = totalBids > (team?.budget_remaining || 0);

  // Show results if resolved
  if (auction.status === 'resolved' && results) {
    return (
      <>
        <Link
          href="/auction"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Auctions
        </Link>

        <Header
          title={`${getMonthName(auction.for_month)} ${auction.for_year} Results`}
          subtitle="Auction has been resolved"
        />

        {/* Summary */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Your Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.filter((r) => r.status === 'won').length}
                </div>
                <div className="text-sm text-green-700">Movies Won</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {results.filter((r) => r.status === 'outbid').length}
                </div>
                <div className="text-sm text-red-700">Outbid</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(
                    results
                      .filter((r) => r.status === 'won')
                      .reduce((sum, r) => sum + r.winning_bid, 0)
                  )}
                </div>
                <div className="text-sm text-purple-700">Total Spent</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {results.filter((r) => r.status === 'no_bid').length}
                </div>
                <div className="text-sm text-gray-700">No Bid</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-4 font-semibold text-gray-900">Movie</th>
                    <th className="text-left p-4 font-semibold text-gray-900">Winner</th>
                    <th className="text-right p-4 font-semibold text-gray-900">Winning Bid</th>
                    <th className="text-right p-4 font-semibold text-gray-900">Your Bid</th>
                    <th className="text-center p-4 font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.movie.id} className="border-b border-gray-100">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {result.movie.poster_url ? (
                            <img
                              src={result.movie.poster_url}
                              alt={result.movie.title}
                              className="w-10 h-15 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-15 bg-gray-200 rounded flex items-center justify-center">
                              <Film className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <Link
                            href={`/movies/${result.movie.id}`}
                            className="font-medium text-gray-900 hover:text-purple-600"
                          >
                            {result.movie.title}
                          </Link>
                        </div>
                      </td>
                      <td className="p-4">
                        {result.winner ? (
                          <Link
                            href={`/teams/${result.winner.id}`}
                            className="text-gray-700 hover:text-purple-600"
                          >
                            {result.winner.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400">Unowned</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {result.winning_bid > 0 ? formatCurrency(result.winning_bid) : '-'}
                      </td>
                      <td className="p-4 text-right">
                        {result.your_bid !== null ? formatCurrency(result.your_bid) : '-'}
                      </td>
                      <td className="p-4 text-center">
                        {result.status === 'won' && (
                          <Badge variant="green">Won</Badge>
                        )}
                        {result.status === 'outbid' && (
                          <Badge variant="red">Outbid</Badge>
                        )}
                        {result.status === 'unowned' && (
                          <Badge variant="gray">Unowned</Badge>
                        )}
                        {result.status === 'no_bid' && (
                          <Badge variant="gray">No Bid</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  // Show bid form if auction is open
  return (
    <>
      <Link
        href="/auction"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Auctions
      </Link>

      <Header
        title={`${getMonthName(auction.for_month)} ${auction.for_year} Auction`}
        subtitle={
          auction.status === 'open'
            ? `Closes ${formatDate(auction.closes_at)}`
            : auction.status === 'upcoming'
              ? `Opens ${formatDate(auction.opens_at)}`
              : 'Processing results...'
        }
      />

      {auction.status === 'open' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Bid Form */}
          <div className="lg:col-span-2 space-y-4">
            {movies.map((movie) => (
              <BidRow
                key={movie.id}
                movie={movie}
                bidAmount={bids.get(movie.id) || 0}
                maxBid={team?.budget_remaining || 0}
                onBidChange={handleBidChange}
                saving={saving.has(movie.id)}
              />
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AuctionCountdown
              targetDate={auction.closes_at}
              label="Auction closes in"
            />

            <BudgetTracker
              totalBudget={team?.budget_remaining || 0}
              totalBids={totalBids}
            />
          </div>
        </div>
      )}

      {auction.status === 'upcoming' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">
              This auction hasn&apos;t started yet. Check back when it opens.
            </p>
          </CardContent>
        </Card>
      )}

      {auction.status === 'closed' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-purple-600 animate-spin" />
            <p className="text-gray-600">
              The auction has closed and results are being processed...
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function BidRow({
  movie,
  bidAmount,
  maxBid,
  onBidChange,
  saving,
}: {
  movie: Movie;
  bidAmount: number;
  maxBid: number;
  onBidChange: (movieId: string, amount: number) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(bidAmount > 0 ? bidAmount.toString() : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    const numValue = parseFloat(newValue) || 0;
    if (numValue >= 0) {
      onBidChange(movie.id, numValue);
    }
  };

  return (
    <div className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 p-4">
      {/* Movie Info */}
      <div className="w-12 h-18 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/movies/${movie.id}`}
          className="font-medium text-gray-900 truncate hover:text-purple-600"
        >
          {movie.title}
        </Link>
        <p className="text-sm text-gray-500">
          {movie.genre || 'Unknown'} • Score: {formatScore(movie.calculated_score)}
        </p>
      </div>

      {/* Bid Input */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={handleChange}
            placeholder="0.00"
            className="w-24 pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Status Indicator */}
        <div className="w-6">
          {saving && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
          {!saving && bidAmount > 0 && <Check className="h-4 w-4 text-green-500" />}
        </div>
      </div>
    </div>
  );
}
