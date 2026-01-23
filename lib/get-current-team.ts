import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Team, League } from '@/types';

export interface CurrentTeam extends Team {
  league: League;
  is_commissioner: boolean;
}

/**
 * Gets the current team for the logged-in user based on their cookie selection.
 * Falls back to the first team if no selection is stored.
 * Returns null if user has no teams.
 */
export async function getCurrentTeam(): Promise<CurrentTeam | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get selected team ID from cookie
  const cookieStore = await cookies();
  const selectedTeamId = cookieStore.get('efs-selected-team-id')?.value;

  // If we have a selected team ID, try to fetch that specific team
  if (selectedTeamId) {
    const { data: team } = await supabase
      .from('teams')
      .select(`
        *,
        league:leagues(*)
      `)
      .eq('id', selectedTeamId)
      .eq('user_id', user.id)
      .single();

    if (team) {
      // Check if user is commissioner of this league
      const { data: commissionerCheck } = await supabase
        .from('leagues')
        .select('id')
        .eq('id', team.league_id)
        .eq('commissioner_user_id', user.id)
        .single();

      return {
        ...team,
        league: team.league,
        is_commissioner: !!commissionerCheck,
      };
    }
  }

  // Fallback: get the user's first team
  const { data: team } = await supabase
    .from('teams')
    .select(`
      *,
      league:leagues(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!team) return null;

  // Check if user is commissioner of this league
  const { data: commissionerCheck } = await supabase
    .from('leagues')
    .select('id')
    .eq('id', team.league_id)
    .eq('commissioner_user_id', user.id)
    .single();

  return {
    ...team,
    league: team.league,
    is_commissioner: !!commissionerCheck,
  };
}

/**
 * Gets just the league ID for the current user's selected team.
 * Useful for quick queries that just need the league context.
 */
export async function getCurrentLeagueId(): Promise<string | null> {
  const team = await getCurrentTeam();
  return team?.league_id || null;
}
