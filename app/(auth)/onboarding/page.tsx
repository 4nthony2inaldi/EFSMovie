import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { OnboardingContent } from './onboarding-content';

interface OnboardingPageProps {
  searchParams: Promise<{ invite?: string }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  const inviteCode = params.invite;

  if (!user) {
    // Preserve invite code when redirecting to login
    if (inviteCode) {
      redirect(`/login?next=/onboarding?invite=${encodeURIComponent(inviteCode)}`);
    }
    redirect('/login');
  }

  // Check if user already has teams - if so, they don't need onboarding
  const { data: existingTeams } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (existingTeams && existingTeams.length > 0) {
    // User already has a team - redirect to join page if they have an invite code
    // This allows existing users to join additional leagues via invite
    if (inviteCode) {
      redirect(`/leagues/join?invite=${encodeURIComponent(inviteCode)}`);
    }
    // Otherwise, redirect to standings
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
