'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Team, League } from '@/types';

export interface TeamWithLeague extends Team {
  league: League;
  is_commissioner: boolean;
}

interface LeagueContextType {
  teams: TeamWithLeague[];
  currentTeam: TeamWithLeague | null;
  currentLeague: League | null;
  isLoading: boolean;
  switchTeam: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

const STORAGE_KEY = 'efs-selected-team-id';
const COOKIE_KEY = 'efs-selected-team-id';

function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

export function LeagueProvider({
  children,
  initialTeams = [],
  initialTeamId,
}: {
  children: ReactNode;
  initialTeams?: TeamWithLeague[];
  initialTeamId?: string;
}) {
  const [teams, setTeams] = useState<TeamWithLeague[]>(initialTeams);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(initialTeams.length === 0);
  const supabase = createClient();

  // Initialize current team from localStorage or use first team
  useEffect(() => {
    if (teams.length === 0) return;

    // Try to get saved team ID from localStorage
    const savedTeamId = localStorage.getItem(STORAGE_KEY);

    // Check if saved team exists in user's teams
    const savedTeam = savedTeamId ? teams.find(t => t.id === savedTeamId) : null;

    if (savedTeam) {
      setCurrentTeamId(savedTeam.id);
      setCookie(COOKIE_KEY, savedTeam.id);
    } else if (initialTeamId && teams.find(t => t.id === initialTeamId)) {
      setCurrentTeamId(initialTeamId);
      localStorage.setItem(STORAGE_KEY, initialTeamId);
      setCookie(COOKIE_KEY, initialTeamId);
    } else {
      // Default to first team
      setCurrentTeamId(teams[0].id);
      localStorage.setItem(STORAGE_KEY, teams[0].id);
      setCookie(COOKIE_KEY, teams[0].id);
    }
  }, [teams, initialTeamId]);

  const refreshTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all teams for this user with their leagues
      const { data: userTeams, error } = await supabase
        .from('teams')
        .select(`
          *,
          league:leagues(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching teams:', error);
        return;
      }

      // Fetch leagues where user is commissioner
      const { data: commissionerLeagues } = await supabase
        .from('leagues')
        .select('id')
        .eq('commissioner_user_id', user.id);

      const commissionerLeagueIds = new Set(commissionerLeagues?.map(l => l.id) || []);

      // Map teams with commissioner status
      const teamsWithLeague: TeamWithLeague[] = (userTeams || []).map(team => ({
        ...team,
        league: team.league,
        is_commissioner: commissionerLeagueIds.has(team.league_id),
      }));

      setTeams(teamsWithLeague);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Load teams on mount if not provided
  useEffect(() => {
    if (initialTeams.length === 0) {
      refreshTeams();
    }
  }, [initialTeams.length, refreshTeams]);

  const switchTeam = useCallback((teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeamId(teamId);
      localStorage.setItem(STORAGE_KEY, teamId);
      setCookie(COOKIE_KEY, teamId);
      // Refresh the page to reload data for new team
      window.location.reload();
    }
  }, [teams]);

  const currentTeam = teams.find(t => t.id === currentTeamId) || null;
  const currentLeague = currentTeam?.league || null;

  return (
    <LeagueContext.Provider
      value={{
        teams,
        currentTeam,
        currentLeague,
        isLoading,
        switchTeam,
        refreshTeams,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
}

// Hook to get current team ID from localStorage (for server components)
export function getStoredTeamId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
