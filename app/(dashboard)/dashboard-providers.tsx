'use client';

import { ReactNode } from 'react';
import { LeagueProvider, TeamWithLeague } from '@/contexts/league-context';

interface DashboardProvidersProps {
  children: ReactNode;
  initialTeams: TeamWithLeague[];
  initialTeamId?: string;
}

export function DashboardProviders({
  children,
  initialTeams,
  initialTeamId,
}: DashboardProvidersProps) {
  return (
    <LeagueProvider initialTeams={initialTeams} initialTeamId={initialTeamId}>
      {children}
    </LeagueProvider>
  );
}
