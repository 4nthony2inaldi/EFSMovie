import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, Users, Film, Gavel, ChevronRight } from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Get counts
  const [
    { count: leagueCount },
    { count: teamCount },
    { count: movieCount },
    { count: auctionCount },
  ] = await Promise.all([
    supabase.from('leagues').select('*', { count: 'exact', head: true }),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
    supabase.from('movies').select('*', { count: 'exact', head: true }),
    supabase.from('auctions').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Trophy className="h-8 w-8 text-gold-500" />}
          label="Leagues"
          value={leagueCount || 0}
          href="/admin/leagues"
        />
        <StatCard
          icon={<Users className="h-8 w-8 text-blue-500" />}
          label="Teams"
          value={teamCount || 0}
          href="/admin/teams"
        />
        <StatCard
          icon={<Film className="h-8 w-8 text-purple-500" />}
          label="Movies"
          value={movieCount || 0}
          href="/admin/movies"
        />
        <StatCard
          icon={<Gavel className="h-8 w-8 text-green-500" />}
          label="Auctions"
          value={auctionCount || 0}
          href="/admin/auctions"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/admin/leagues?action=create"
              className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-900">Create New League</span>
              </div>
              <ChevronRight className="h-5 w-5 text-purple-400" />
            </Link>
            <Link
              href="/admin/teams?action=create"
              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Add Team to League</span>
              </div>
              <ChevronRight className="h-5 w-5 text-blue-400" />
            </Link>
            <Link
              href="/admin/movies?action=create"
              className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Film className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Add New Movie</span>
              </div>
              <ChevronRight className="h-5 w-5 text-green-400" />
            </Link>
            <Link
              href="/admin/auctions?action=create"
              className="flex items-center justify-between p-4 bg-gold-50 rounded-lg hover:bg-gold-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Gavel className="h-5 w-5 text-gold-600" />
                <span className="font-medium text-gold-900">Create Auction</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gold-400" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">{label}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
            {icon}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
