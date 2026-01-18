import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { AuctionCountdown } from '@/components/auction/auction-countdown';
import { getMonthName, formatDate, isFuture, isPast } from '@/lib/utils';
import { Gavel, Calendar, Clock, CheckCircle, Film } from 'lucide-react';

export default async function AuctionPage() {
  const supabase = await createClient();

  // Get user's team and league
  const { data: { user } } = await supabase.auth.getUser();
  const { data: team } = await supabase
    .from('teams')
    .select('id, league_id, budget_remaining')
    .eq('user_id', user?.id)
    .single();

  if (!team?.league_id) {
    return (
      <>
        <Header title="Auction" subtitle="Monthly movie auctions" />
        <EmptyState
          icon={<Gavel className="h-12 w-12" />}
          title="Not in a league"
          description="You haven't joined a league yet."
        />
      </>
    );
  }

  // Get all auctions for this league
  const { data: auctions } = await supabase
    .from('auctions')
    .select('*')
    .eq('league_id', team.league_id)
    .order('for_year', { ascending: false })
    .order('for_month', { ascending: false });

  // Find current/active auction
  const now = new Date();
  const openAuction = auctions?.find((a) => a.status === 'open');
  const upcomingAuction = auctions?.find((a) => a.status === 'upcoming' && isFuture(a.opens_at));
  const closedAuction = auctions?.find((a) => a.status === 'closed');

  // Get user's bid status for open auction
  let hasBids = false;
  if (openAuction) {
    const { count } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('auction_id', openAuction.id)
      .eq('team_id', team.id);
    hasBids = (count || 0) > 0;
  }

  return (
    <>
      <Header title="Auction" subtitle="Monthly movie auctions" />

      {/* Current Status */}
      {openAuction && (
        <Card className="mb-8 border-purple-200 bg-purple-50/50">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <Badge variant="purple" className="mb-2">Active Auction</Badge>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {getMonthName(openAuction.for_month)} {openAuction.for_year} Movies
                </h2>
                <p className="text-gray-600 mb-4">
                  Closes {formatDate(openAuction.closes_at)}
                </p>

                <div className="flex items-center gap-4">
                  <Link
                    href={`/auction/${openAuction.id}`}
                    className="btn-primary"
                  >
                    {hasBids ? 'Edit Your Bids' : 'Place Your Bids'}
                  </Link>
                  {hasBids && (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Bids submitted
                    </span>
                  )}
                </div>
              </div>

              <div className="lg:w-80">
                <AuctionCountdown
                  targetDate={openAuction.closes_at}
                  label="Auction closes in"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {closedAuction && !openAuction && (
        <Card className="mb-8 border-gold-200 bg-gold-50/50">
          <CardContent className="p-6">
            <Badge variant="gold" className="mb-2">Processing Results</Badge>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getMonthName(closedAuction.for_month)} {closedAuction.for_year} Auction
            </h2>
            <p className="text-gray-600">
              The auction has closed. Results are being calculated...
            </p>
          </CardContent>
        </Card>
      )}

      {upcomingAuction && !openAuction && !closedAuction && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <Badge variant="default" className="mb-2">Coming Soon</Badge>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {getMonthName(upcomingAuction.for_month)} {upcomingAuction.for_year} Auction
                </h2>
                <p className="text-gray-600">
                  Opens {formatDate(upcomingAuction.opens_at)}
                </p>
              </div>

              <div className="lg:w-80">
                <AuctionCountdown
                  targetDate={upcomingAuction.opens_at}
                  label="Auction opens in"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!openAuction && !closedAuction && !upcomingAuction && (
        <EmptyState
          icon={<Gavel className="h-12 w-12" />}
          title="No auctions scheduled"
          description="Check back later for upcoming auctions."
          className="mb-8"
        />
      )}

      {/* Past Auctions */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">All Auctions</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {auctions?.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </div>

      {(!auctions || auctions.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No auctions have been created yet</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function AuctionCard({ auction }: { auction: any }) {
  const statusColors = {
    upcoming: 'bg-gray-100 text-gray-700',
    open: 'bg-green-100 text-green-700',
    closed: 'bg-gold-100 text-gold-700',
    resolved: 'bg-purple-100 text-purple-700',
  };

  const statusLabels = {
    upcoming: 'Upcoming',
    open: 'Open',
    closed: 'Processing',
    resolved: 'Completed',
  };

  return (
    <Link href={`/auction/${auction.id}`}>
      <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">
                {getMonthName(auction.for_month)} {auction.for_year}
              </h3>
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[auction.status as keyof typeof statusColors]}`}>
                {statusLabels[auction.status as keyof typeof statusLabels]}
              </span>
            </div>
            <Gavel className="h-5 w-5 text-gray-400" />
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Opens: {formatDate(auction.opens_at)}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Closes: {formatDate(auction.closes_at)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
