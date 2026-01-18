import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NavSidebar } from '@/components/layout/nav-sidebar';

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

  // Get user's team
  const { data: team } = await supabase
    .from('teams')
    .select('name, photo_url')
    .eq('user_id', user.id)
    .single();

  // If no team, redirect to onboarding
  if (!team) {
    redirect('/onboarding');
  }

  // Check if user is a commissioner
  const { data: commissionerLeague } = await supabase
    .from('leagues')
    .select('id')
    .eq('commissioner_user_id', user.id)
    .single();

  const isCommissioner = !!commissionerLeague;

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <NavSidebar teamName={team?.name} teamPhotoUrl={team?.photo_url} isCommissioner={isCommissioner} />

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
