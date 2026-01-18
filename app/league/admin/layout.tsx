import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Users,
  Film,
  Trophy,
  Gavel,
  Home,
  Settings,
  Mail,
} from 'lucide-react';

export default async function LeagueAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get league where user is commissioner
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('commissioner_user_id', user.id)
    .single();

  if (!league) {
    // Not a commissioner, redirect to standings
    redirect('/standings');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-gold-400" />
              <div>
                <h1 className="text-xl font-bold">League Admin</h1>
                <p className="text-purple-300 text-sm">{league.name}</p>
              </div>
            </div>
            <Link
              href="/standings"
              className="flex items-center gap-2 text-purple-200 hover:text-white"
            >
              <Home className="h-5 w-5" />
              Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            <NavLink href="/league/admin" icon={<Shield className="h-4 w-4" />}>
              Dashboard
            </NavLink>
            <NavLink href="/league/admin/settings" icon={<Settings className="h-4 w-4" />}>
              Settings
            </NavLink>
            <NavLink href="/league/admin/teams" icon={<Users className="h-4 w-4" />}>
              Teams
            </NavLink>
            <NavLink href="/league/admin/invites" icon={<Mail className="h-4 w-4" />}>
              Invites
            </NavLink>
            <NavLink href="/league/admin/movies" icon={<Film className="h-4 w-4" />}>
              Movies
            </NavLink>
            <NavLink href="/league/admin/auctions" icon={<Gavel className="h-4 w-4" />}>
              Auctions
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 border-b-2 border-transparent hover:border-purple-600 transition-colors whitespace-nowrap"
    >
      {icon}
      {children}
    </Link>
  );
}
