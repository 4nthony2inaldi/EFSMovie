import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { NavSidebar } from '@/components/layout/nav-sidebar';
import { DashboardProviders } from './dashboard-providers';
import type { TeamWithLeague } from '@/contexts/league-context';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get all user's teams with their leagues
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      *,
      league:leagues(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  // If no teams, redirect to onboarding
  if (!teams || teams.length === 0) {
    redirect('/onboarding');
  }

  // Check which leagues user is commissioner of
  const { data: commissionerLeagues } = await supabase
    .from('leagues')
    .select('id')
    .eq('commissioner_user_id', user.id);

  const commissionerLeagueIds = new Set(commissionerLeagues?.map(l => l.id) || []);

  // Map teams with commissioner status
  const teamsWithLeague: TeamWithLeague[] = teams.map(team => ({
    ...team,
    league: team.league,
    is_commissioner: commissionerLeagueIds.has(team.league_id),
  }));

  // Get selected team ID from cookie (if any)
  const cookieStore = await cookies();
  const selectedTeamId = cookieStore.get('efs-selected-team-id')?.value;

  // Determine initial team: use saved selection if valid, otherwise first team
  const initialTeamId = selectedTeamId && teamsWithLeague.find(t => t.id === selectedTeamId)
    ? selectedTeamId
    : teamsWithLeague[0].id;

  return (
    <DashboardProviders initialTeams={teamsWithLeague} initialTeamId={initialTeamId}>
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <NavSidebar />

        {/* Main content */}
        <main className="lg:ml-64 min-h-screen overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </DashboardProviders>
  );
}
