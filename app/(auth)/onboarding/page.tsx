import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { OnboardingContent } from './onboarding-content';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user already has teams - if so, they don't need onboarding
  const { data: existingTeams } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (existingTeams && existingTeams.length > 0) {
    // User already has a team, redirect to standings
    redirect('/standings');
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
