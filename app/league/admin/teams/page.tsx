'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Users, Loader2, Trash2, UserX } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  user_id: string;
  budget_remaining: number;
  created_at: string;
}

export default function LeagueTeamsPage() {
  const supabase = createClient();
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get commissioner's league
    const { data: league } = await supabase
      .from('leagues')
      .select('id')
      .eq('commissioner_user_id', user.id)
      .single();

    if (!league) return;
    setLeagueId(league.id);

    // Get teams
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('league_id', league.id)
      .order('created_at', { ascending: true });

    setTeams(data || []);
    setLoading(false);
  }

  async function handleRemoveTeam(teamId: string, teamName: string) {
    if (!confirm(`Are you sure you want to remove "${teamName}" from the league? Their movies will be returned to the pool.`)) {
      return;
    }

    await supabase.from('teams').delete().eq('id', teamId);
    loadTeams();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Teams</h1>
        <Badge variant="purple">{teams.length} teams</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {teams.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No teams yet</p>
              <p className="text-sm mt-1">Invite players to join your league</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold">#</th>
                  <th className="text-left p-4 font-semibold">Team</th>
                  <th className="text-left p-4 font-semibold">Budget</th>
                  <th className="text-left p-4 font-semibold">Joined</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, index) => (
                  <tr key={team.id} className="border-b border-gray-100">
                    <td className="p-4 text-gray-500">{index + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-bold text-sm">
                            {team.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={team.budget_remaining < 100 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(team.budget_remaining)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {new Date(team.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRemoveTeam(team.id, team.name)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove from league"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-gray-500 mt-4">
        To add more teams, send invites or share your league ID and password with players.
      </p>
    </div>
  );
}
