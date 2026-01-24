import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  ShieldCheck,
  Users,
  Trophy,
  Home,
  LayoutDashboard,
} from 'lucide-react';

export default async function SiteAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Double-check admin access (middleware should catch this, but defense in depth)
  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    redirect('/standings');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-red-400" />
              <div>
                <h1 className="text-xl font-bold">Site Admin</h1>
                <p className="text-gray-400 text-sm">Manage all leagues and teams</p>
              </div>
            </div>
            <Link
              href="/standings"
              className="flex items-center gap-2 text-gray-300 hover:text-white"
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
            <NavLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>
              Dashboard
            </NavLink>
            <NavLink href="/admin/leagues" icon={<Trophy className="h-4 w-4" />}>
              Leagues
            </NavLink>
            <NavLink href="/admin/teams" icon={<Users className="h-4 w-4" />}>
              Teams
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
      className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 border-b-2 border-transparent hover:border-red-600 transition-colors whitespace-nowrap"
    >
      {icon}
      {children}
    </Link>
  );
}
