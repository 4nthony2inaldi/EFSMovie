'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';
import { Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  user_id: string;
  league_id: string;
  budget_remaining: number;
  photo_url: string | null;
  league?: { name: string };
}

interface League {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
}

export default function AdminTeamsPage() {
  const supabase = createClient();
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    user_id: '',
    league_id: '',
    budget_remaining: 1000,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [teamsRes, leaguesRes] = await Promise.all([
      supabase.from('teams').select('*, league:leagues(name)').order('name'),
      supabase.from('leagues').select('id, name').order('name'),
    ]);

    setTeams(teamsRes.data || []);
    setLeagues(leaguesRes.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      await supabase
        .from('teams')
        .update({
          name: formData.name,
          league_id: formData.league_id,
          budget_remaining: formData.budget_remaining,
        })
        .eq('id', editingId);
    } else {
      await supabase.from('teams').insert({
        name: formData.name,
        user_id: formData.user_id,
        league_id: formData.league_id,
        budget_remaining: formData.budget_remaining,
      });
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', user_id: '', league_id: '', budget_remaining: 1000 });
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }
    await supabase.from('teams').delete().eq('id', id);
    loadData();
  }

  function startEdit(team: Team) {
    setFormData({
      name: team.name,
      user_id: team.user_id,
      league_id: team.league_id,
      budget_remaining: team.budget_remaining,
    });
    setEditingId(team.id);
    setShowForm(true);
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
        <button
          onClick={() => {
            setFormData({ name: '', user_id: '', league_id: leagues[0]?.id || '', budget_remaining: 1000 });
            setEditingId(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Team
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Team' : 'Add New Team'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Team Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Team Name"
                    required
                  />
                </div>
                <div>
                  <label className="label">League</label>
                  <select
                    value={formData.league_id}
                    onChange={(e) => setFormData({ ...formData, league_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select League</option>
                    {leagues.map((league) => (
                      <option key={league.id} value={league.id}>
                        {league.name}
                      </option>
                    ))}
                  </select>
                </div>
                {!editingId && (
                  <div>
                    <label className="label">User ID</label>
                    <input
                      type="text"
                      value={formData.user_id}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      className="input"
                      placeholder="User UUID from Supabase Auth"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Find this in Supabase → Authentication → Users
                    </p>
                  </div>
                )}
                <div>
                  <label className="label">Budget</label>
                  <input
                    type="number"
                    value={formData.budget_remaining}
                    onChange={(e) =>
                      setFormData({ ...formData, budget_remaining: parseFloat(e.target.value) })
                    }
                    className="input"
                    min={0}
                    max={1000}
                    step={0.01}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Update' : 'Add'} Team
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Teams List */}
      <Card>
        <CardContent className="p-0">
          {teams.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No teams created yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold">Team</th>
                  <th className="text-left p-4 font-semibold">League</th>
                  <th className="text-left p-4 font-semibold">Budget</th>
                  <th className="text-left p-4 font-semibold">User ID</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-gray-100">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={team.name} src={team.photo_url} size="md" />
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="purple">
                        {(team.league as unknown as { name: string })?.name || 'No League'}
                      </Badge>
                    </td>
                    <td className="p-4">{formatCurrency(team.budget_remaining)}</td>
                    <td className="p-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {team.user_id.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => startEdit(team)}
                        className="p-2 text-gray-400 hover:text-purple-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(team.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
