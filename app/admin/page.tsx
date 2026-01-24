import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, Users, Film, Gavel } from 'lucide-react';
import Link from 'next/link';

export default async function SiteAdminDashboard() {
  const supabase = await createClient();

  // Get counts for overview
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

  // Get recent leagues
  const { data: recentLeagues } = await supabase
    .from('leagues')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Site Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of all leagues and teams across the platform</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Trophy className="h-6 w-6 text-purple-600" />}
          label="Total Leagues"
          value={leagueCount || 0}
          href="/admin/leagues"
        />
        <StatCard
          icon={<Users className="h-6 w-6 text-blue-600" />}
          label="Total Teams"
          value={teamCount || 0}
          href="/admin/teams"
        />
        <StatCard
          icon={<Film className="h-6 w-6 text-green-600" />}
          label="Total Movies"
          value={movieCount || 0}
        />
        <StatCard
          icon={<Gavel className="h-6 w-6 text-orange-600" />}
          label="Total Auctions"
          value={auctionCount || 0}
        />
      </div>

      {/* Recent Leagues */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Leagues</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLeagues && recentLeagues.length > 0 ? (
            <div className="space-y-3">
              {recentLeagues.map((league) => (
                <div
                  key={league.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{league.name}</p>
                    <p className="text-sm text-gray-500">
                      Created {new Date(league.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/admin/leagues?id=${league.id}`}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No leagues yet</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/teams"
              className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <Users className="h-6 w-6 text-purple-600 mb-2" />
              <h3 className="font-medium text-gray-900">Manage Teams</h3>
              <p className="text-sm text-gray-500">Move teams between leagues, edit team details</p>
            </Link>
            <Link
              href="/admin/leagues"
              className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <Trophy className="h-6 w-6 text-purple-600 mb-2" />
              <h3 className="font-medium text-gray-900">Manage Leagues</h3>
              <p className="text-sm text-gray-500">View all leagues, edit settings</p>
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
  href?: string;
}) {
  const content = (
    <Card className={href ? 'hover:border-purple-300 transition-colors' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
