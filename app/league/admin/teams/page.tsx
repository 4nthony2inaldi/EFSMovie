'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLeague } from '@/contexts/league-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Users, Loader2, Trash2, UserX, X, Check, Pencil, DollarSign } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  user_id: string;
  budget_remaining: number;
  created_at: string;
}

export default function LeagueTeamsPage() {
  const supabase = createClient();
  const { currentTeam } = useLeague();
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingTeamId, setConfirmingTeamId] = useState<string | null>(null);
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingBudgetTeamId, setEditingBudgetTeamId] = useState<string | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState<string>('');
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    loadTeams();
  }, [currentTeam?.league_id]);

  async function loadTeams() {
    // Use the current league from context (layout already verified commissioner access)
    if (!currentTeam?.league_id) return;

    setLeagueId(currentTeam.league_id);

    // Get teams
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('league_id', currentTeam.league_id)
      .order('created_at', { ascending: true });

    setTeams(data || []);
    setLoading(false);
  }

  async function handleRemoveTeam(teamId: string) {
    setRemovingTeamId(teamId);
    setError(null);

    try {
      const response = await fetch('/api/admin/remove-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to remove team');
        setRemovingTeamId(null);
        setConfirmingTeamId(null);
        return;
      }

      setConfirmingTeamId(null);
      setRemovingTeamId(null);
      loadTeams();
    } catch (err) {
      setError('Network error: Failed to remove team');
      setRemovingTeamId(null);
      setConfirmingTeamId(null);
    }
  }

  function startEditingBudget(team: Team) {
    setEditingBudgetTeamId(team.id);
    setEditingBudgetValue(team.budget_remaining.toString());
    setError(null);
  }

  async function saveBudget(teamId: string) {
    setSavingBudget(true);
    setError(null);

    const newBudget = parseFloat(editingBudgetValue);
    if (isNaN(newBudget) || newBudget < 0) {
      setError('Please enter a valid budget amount');
      setSavingBudget(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/update-team-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, newBudget }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to update budget');
        setSavingBudget(false);
        return;
      }

      setEditingBudgetTeamId(null);
      setEditingBudgetValue('');
      setSavingBudget(false);
      loadTeams();
    } catch (err) {
      setError('Network error: Failed to update budget');
      setSavingBudget(false);
    }
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
                      {editingBudgetTeamId === team.id ? (
                        <div className="flex items-center gap-1">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingBudgetValue}
                              onChange={(e) => setEditingBudgetValue(e.target.value)}
                              className="w-24 pl-5 pr-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveBudget(team.id);
                                if (e.key === 'Escape') setEditingBudgetTeamId(null);
                              }}
                            />
                          </div>
                          <button
                            onClick={() => saveBudget(team.id)}
                            disabled={savingBudget}
                            className="p-1 bg-green-100 text-green-600 hover:bg-green-200 rounded transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            {savingBudget ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingBudgetTeamId(null)}
                            disabled={savingBudget}
                            className="p-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={team.budget_remaining < 100 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(team.budget_remaining)}
                          </span>
                          <button
                            onClick={() => startEditingBudget(team)}
                            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                            title="Edit budget"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
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
