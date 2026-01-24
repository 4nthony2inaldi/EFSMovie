'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Search, ArrowRight, Loader2, Check, X } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  user_id: string;
  league_id: string;
  created_at: string;
  league: {
    id: string;
    name: string;
  };
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

    setTeams((teamsResult.data as Team[]) || []);
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
                        movingTeamId === team.id ? 'bg-purple-50' : ''
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
