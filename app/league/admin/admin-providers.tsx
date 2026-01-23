'use client';

import { ReactNode } from 'react';
import { LeagueProvider, TeamWithLeague } from '@/contexts/league-context';

interface AdminProvidersProps {
  children: ReactNode;
  initialTeam: TeamWithLeague;
}

export function AdminProviders({
  children,
  initialTeam,
}: AdminProvidersProps) {
  // Wrap children with LeagueProvider using the initial team from server
  return (
    <LeagueProvider initialTeams={[initialTeam]} initialTeamId={initialTeam.id}>
      {children}
    </LeagueProvider>
  );
}
