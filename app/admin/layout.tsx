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
  ChevronRight
} from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user is admin
  const isAdmin = user?.id === process.env.ADMIN_USER_ID;

  if (!user || !isAdmin) {
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
                <h1 className="text-xl font-bold">Admin Console</h1>
                <p className="text-purple-300 text-sm">EFS Movie League</p>
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
          <div className="flex gap-1">
            <NavLink href="/admin" icon={<Shield className="h-4 w-4" />}>
              Dashboard
            </NavLink>
            <NavLink href="/admin/leagues" icon={<Trophy className="h-4 w-4" />}>
              Leagues
            </NavLink>
            <NavLink href="/admin/teams" icon={<Users className="h-4 w-4" />}>
              Teams
            </NavLink>
            <NavLink href="/admin/movies" icon={<Film className="h-4 w-4" />}>
              Movies
            </NavLink>
            <NavLink href="/admin/auctions" icon={<Gavel className="h-4 w-4" />}>
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
      className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 border-b-2 border-transparent hover:border-purple-600 transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
