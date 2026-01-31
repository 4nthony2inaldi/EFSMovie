'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Search, ArrowRight, Loader2, Check, X, Key, Copy, Eye, EyeOff } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  user_id: string;
  league_id: string;
  created_at: string;
  league: {
    id: string;
    name: string;
  } | null;
}

interface RawTeam {
  id: string;
  name: string;
  user_id: string;
  league_id: string;
  created_at: string;
  league: { id: string; name: string }[] | { id: string; name: string } | null;
}

interface League {
  id: string;
  name: string;
}

export default function AdminTeamsPage() {
  const supabase = createClient();
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLeague, setFilterLeague] = useState('');
  const [movingTeamId, setMovingTeamId] = useState<string | null>(null);
  const [targetLeagueId, setTargetLeagueId] = useState<string>('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveSuccess, setMoveSuccess] = useState<string | null>(null);

  // Reset password state
  const [resettingTeamId, setResettingTeamId] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<{ teamId: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [teamsResult, leaguesResult] = await Promise.all([
      supabase
        .from('teams')
        .select(`
          id,
          name,
          user_id,
          league_id,
          created_at,
          league:leagues(id, name)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('leagues')
        .select('id, name')
        .order('name'),
    ]);

    // Transform the data - league comes back as array from Supabase join
    const transformedTeams: Team[] = ((teamsResult.data as RawTeam[]) || []).map(team => ({
      ...team,
      league: Array.isArray(team.league) ? team.league[0] || null : team.league,
    }));
    setTeams(transformedTeams);
    setLeagues(leaguesResult.data || []);
    setLoading(false);
  }

  async function handleMoveTeam() {
    if (!movingTeamId || !targetLeagueId) return;

    setMoveLoading(true);
    setMoveError(null);
    setMoveSuccess(null);

    try {
      const response = await fetch('/api/admin/move-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: movingTeamId,
          targetLeagueId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMoveError(data.error || 'Failed to move team');
      } else {
        setMoveSuccess(data.message);
        setMovingTeamId(null);
        setTargetLeagueId('');
        loadData();
      }
    } catch (error) {
      setMoveError('Network error - please try again');
    }

    setMoveLoading(false);
  }

  async function handleResetPassword() {
    if (!resettingTeamId) return;

    const team = teams.find(t => t.id === resettingTeamId);
    if (!team) return;

    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const response = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: team.user_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResetError(data.error || 'Failed to reset password');
      } else {
        setResetSuccess({ teamId: resettingTeamId, password: data.temporaryPassword });
      }
    } catch (error) {
      setResetError('Network error - please try again');
    }

    setResetLoading(false);
  }

  function handleCopyPassword() {
    if (resetSuccess?.password) {
      navigator.clipboard.writeText(resetSuccess.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCloseReset() {
    setResettingTeamId(null);
    setResetError(null);
    setResetSuccess(null);
    setShowPassword(false);
    setCopied(false);
  }

  const filteredTeams = teams.filter((team) => {
    const matchesSearch = team.name.toLowerCase().includes(search.toLowerCase());
    const matchesLeague = !filterLeague || team.league_id === filterLeague;
    return matchesSearch && matchesLeague;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <p className="text-gray-600 mt-1">View and manage all teams across leagues</p>
      </div>

      {/* Success/Error Messages */}
      {moveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <Check className="h-5 w-5" />
          {moveSuccess}
        </div>
      )}
      {moveError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <X className="h-5 w-5" />
          {moveError}
        </div>
      )}

      {/* Reset Password Success Message with Password */}
      {resetSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <Check className="h-5 w-5" />
            <span className="font-medium">Temporary password generated!</span>
          </div>
          <p className="text-sm text-green-600 mb-3">
            Share this password with the user. They will be required to change it on their next login.
          </p>
          <p className="text-sm text-gray-500 mb-3">
            Team: <span className="font-medium">{teams.find(t => t.id === resetSuccess.teamId)?.name}</span>
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-green-200 p-3">
            <code className="flex-1 font-mono text-lg">
              {showPassword ? resetSuccess.password : '••••••••••••'}
            </code>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-2 text-gray-500 hover:text-gray-700"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
            <button
              onClick={handleCopyPassword}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Copy password"
            >
              {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <button
            onClick={handleCloseReset}
            className="mt-3 text-sm text-green-700 hover:text-green-800 font-medium"
          >
            Done
          </button>
        </div>
      )}

      {/* Reset Password Error Message */}
      {resetError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <X className="h-5 w-5" />
          {resetError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
            placeholder="Search teams..."
          />
        </div>
        <select
          value={filterLeague}
          onChange={(e) => setFilterLeague(e.target.value)}
          className="input w-auto"
        >
          <option value="">All leagues</option>
          {leagues.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
      </div>

      {/* Move Team Dialog */}
      {movingTeamId && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-purple-600" />
              Move Team to Different League
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target League
                </label>
                <select
                  value={targetLeagueId}
                  onChange={(e) => setTargetLeagueId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select a league...</option>
                  {leagues
                    .filter((l) => l.id !== teams.find((t) => t.id === movingTeamId)?.league_id)
                    .map((league) => (
                      <option key={league.id} value={league.id}>
                        {league.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMoveTeam}
                  disabled={!targetLeagueId || moveLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  {moveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Move Team
                </button>
                <button
                  onClick={() => {
                    setMovingTeamId(null);
                    setTargetLeagueId('');
                    setMoveError(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset Password Confirmation Dialog */}
      {resettingTeamId && !resetSuccess && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-600" />
              Generate Temporary Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This will generate a new temporary password for the user who owns this team. They will be required to change it after logging in.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Team: <span className="font-medium">{teams.find(t => t.id === resettingTeamId)?.name}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="btn-primary flex items-center gap-2"
              >
                {resetLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate Password
              </button>
              <button
                onClick={handleCloseReset}
                className="btn-secondary"
                disabled={resetLoading}
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams List */}
      <Card>
        <CardHeader>
          <CardTitle>All Teams ({filteredTeams.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTeams.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No teams found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-4 font-semibold text-sm">Team</th>
                    <th className="text-left p-4 font-semibold text-sm">League</th>
                    <th className="text-left p-4 font-semibold text-sm">Created</th>
                    <th className="text-right p-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team) => (
                    <tr
                      key={team.id}
                      className={`border-b border-gray-100 ${
                        movingTeamId === team.id ? 'bg-purple-50' : resettingTeamId === team.id ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-gray-400" />
                          <span className="font-medium">{team.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="purple">{team.league?.name || 'Unknown'}</Badge>
                      </td>
                      <td className="p-4 text-gray-600">
                        {new Date(team.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              setResettingTeamId(team.id);
                              setResetError(null);
                              setResetSuccess(null);
                            }}
                            className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                          >
                            <Key className="h-4 w-4" />
                            Reset Password
                          </button>
                          <button
                            onClick={() => {
                              setMovingTeamId(team.id);
                              setTargetLeagueId('');
                              setMoveError(null);
                              setMoveSuccess(null);
                            }}
                            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                          >
                            Move to League
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
