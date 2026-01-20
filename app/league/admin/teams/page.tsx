'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Users, Loader2, Trash2, UserX, X, Check } from 'lucide-react';

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
  const [confirmingTeamId, setConfirmingTeamId] = useState<string | null>(null);
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handleRemoveTeam(teamId: string) {
    setRemovingTeamId(teamId);
    setError(null);

    // Use .select() to get deleted rows - RLS silently blocks deletes without error
    const { data: deletedRows, error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
      .select();

    if (deleteError) {
      setError(`Failed to remove team: ${deleteError.message}`);
      setRemovingTeamId(null);
      setConfirmingTeamId(null);
      return;
    }

    // Check if any rows were actually deleted
    if (!deletedRows || deletedRows.length === 0) {
      setError('Permission denied: Unable to remove team. You may not have commissioner access.');
      setRemovingTeamId(null);
      setConfirmingTeamId(null);
      return;
    }

    setConfirmingTeamId(null);
    setRemovingTeamId(null);
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
                      {confirmingTeamId === team.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-gray-500 mr-1">Remove?</span>
                          <button
                            onClick={() => handleRemoveTeam(team.id)}
                            disabled={removingTeamId === team.id}
                            className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors disabled:opacity-50"
                            title="Confirm remove"
                          >
                            {removingTeamId === team.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmingTeamId(null)}
                            disabled={removingTeamId === team.id}
                            className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmingTeamId(team.id);
                            setError(null);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove from league"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
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
