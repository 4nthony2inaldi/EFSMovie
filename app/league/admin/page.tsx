import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, Users, Film, Gavel, ChevronRight, Copy, Key } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

export default async function LeagueAdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get commissioner's league
  // Use limit(1).maybeSingle() to handle users who are commissioners of multiple leagues
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('commissioner_user_id', user?.id)
    .limit(1)
    .maybeSingle();

  if (!league) {
    return <div>League not found</div>;
  }

  // Get counts
  const [
    { count: teamCount },
    { count: movieCount },
    { count: auctionCount },
    { count: pendingInvites },
  ] = await Promise.all([
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('league_id', league.id),
    supabase.from('movies').select('*', { count: 'exact', head: true }),
    supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('league_id', league.id),
    supabase.from('league_invitations').select('*', { count: 'exact', head: true }).eq('league_id', league.id).eq('status', 'pending'),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">League Dashboard</h1>

      {/* League Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-purple-600" />
            League Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {league.slug ? 'Custom League ID' : 'League ID'}
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono break-all">
                  {league.slug || league.id}
                </code>
                <CopyButton text={league.slug || league.id} />
              </div>
              {league.slug ? (
                <p className="text-xs text-gray-500 mt-1">
                  Share <strong>{league.slug}</strong> with members to join
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  <Link href="/league/admin/settings" className="text-purple-600 hover:underline">
                    Set a custom League ID
                  </Link>
                  {' '}for easier sharing
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Join Password</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono">
                  {league.join_password || <span className="text-gray-400 italic">Not set</span>}
                </code>
                {league.join_password && <CopyButton text={league.join_password} />}
              </div>
              <Link href="/league/admin/settings" className="text-xs text-purple-600 hover:underline mt-1 inline-block">
                Change password
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Users className="h-8 w-8 text-blue-500" />}
          label="Teams"
          value={`${teamCount || 0} / ${league.max_teams || 12}`}
          href="/league/admin/teams"
        />
        <StatCard
          icon={<Trophy className="h-8 w-8 text-gold-500" />}
          label="Pending Invites"
          value={pendingInvites || 0}
          href="/league/admin/invites"
        />
        <StatCard
          icon={<Film className="h-8 w-8 text-purple-500" />}
          label="Movies"
          value={movieCount || 0}
          href="/league/admin/movies"
        />
        <StatCard
          icon={<Gavel className="h-8 w-8 text-green-500" />}
          label="Auctions"
          value={auctionCount || 0}
          href="/league/admin/auctions"
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
              href="/league/admin/invites?action=create"
              className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-900">Invite Players</span>
              </div>
              <ChevronRight className="h-5 w-5 text-purple-400" />
            </Link>
            <Link
              href="/league/admin/auctions?action=create"
              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Gavel className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Create Auction</span>
              </div>
              <ChevronRight className="h-5 w-5 text-blue-400" />
            </Link>
            <Link
              href="/league/admin/movies?action=create"
              className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Film className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Add Movies</span>
              </div>
              <ChevronRight className="h-5 w-5 text-green-400" />
            </Link>
            <Link
              href="/league/admin/settings"
              className="flex items-center justify-between p-4 bg-gold-50 rounded-lg hover:bg-gold-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-gold-600" />
                <span className="font-medium text-gold-900">League Settings</span>
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
  value: number | string;
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
