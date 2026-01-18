'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Film,
  Trophy,
  Users,
  Calendar,
  Gavel,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/standings', label: 'Standings', icon: Trophy },
  { href: '/movies', label: 'Movies', icon: Film },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/auction', label: 'Auction', icon: Gavel },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface NavSidebarProps {
  teamName?: string;
  teamPhotoUrl?: string | null;
}

export function NavSidebar({ teamName, teamPhotoUrl }: NavSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-purple-900 text-white rounded-lg shadow-lg"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-purple-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 flex items-center justify-between">
            <Link href="/standings" className="flex items-center gap-2">
              <Film className="h-8 w-8 text-gold-400" />
              <span className="text-xl font-bold">EFS Movie</span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 hover:bg-purple-800 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Team info */}
          {teamName && (
            <div className="px-6 pb-6">
              <Link
                href="/settings"
                className="flex items-center gap-3 p-3 bg-purple-800/50 rounded-lg hover:bg-purple-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center overflow-hidden">
                  {teamPhotoUrl ? (
                    <img
                      src={teamPhotoUrl}
                      alt={teamName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gold-900 font-bold text-sm">
                      {teamName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{teamName}</p>
                  <p className="text-purple-300 text-sm">Your Team</p>
                </div>
                <ChevronRight className="h-4 w-4 text-purple-400" />
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-purple-700 text-white border-l-4 border-gold-400'
                      : 'text-purple-200 hover:bg-purple-800 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sign out */}
          <div className="p-4 border-t border-purple-700/50">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 w-full text-purple-200 hover:bg-purple-800 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
