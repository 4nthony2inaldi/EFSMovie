'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { OnboardingContent } from './onboarding-content';

export default function OnboardingPage() {
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
