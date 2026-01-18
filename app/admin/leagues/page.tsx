'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Trophy, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface League {
  id: string;
  name: string;
  season_year: number;
  status: string;
  scores_frozen_at: string | null;
  created_at: string;
}

export default function AdminLeaguesPage() {
  const supabase = createClient();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', season_year: 2026 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLeagues();
  }, []);

  async function loadLeagues() {
    const { data } = await supabase
      .from('leagues')
      .select('*')
      .order('season_year', { ascending: false });
    setLeagues(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      await supabase
        .from('leagues')
        .update({ name: formData.name, season_year: formData.season_year })
        .eq('id', editingId);
    } else {
      await supabase
        .from('leagues')
        .insert({ name: formData.name, season_year: formData.season_year });
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', season_year: 2026 });
    loadLeagues();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this league? This will delete all teams and data.')) {
      return;
    }
    await supabase.from('leagues').delete().eq('id', id);
    loadLeagues();
  }

  function startEdit(league: League) {
    setFormData({ name: league.name, season_year: league.season_year });
    setEditingId(league.id);
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
        <h1 className="text-2xl font-bold text-gray-900">Manage Leagues</h1>
        <button
          onClick={() => {
            setFormData({ name: '', season_year: 2026 });
            setEditingId(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create League
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit League' : 'Create New League'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">League Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="EFS Movie League"
                    required
                  />
                </div>
                <div>
                  <label className="label">Season Year</label>
                  <input
                    type="number"
                    value={formData.season_year}
                    onChange={(e) => setFormData({ ...formData, season_year: parseInt(e.target.value) })}
                    className="input"
                    min={2024}
                    max={2030}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Update' : 'Create'} League
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

      {/* Leagues List */}
      <Card>
        <CardContent className="p-0">
          {leagues.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No leagues created yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold">Name</th>
                  <th className="text-left p-4 font-semibold">Season</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Created</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leagues.map((league) => (
                  <tr key={league.id} className="border-b border-gray-100">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-gold-500" />
                        <span className="font-medium">{league.name}</span>
                      </div>
                    </td>
                    <td className="p-4">{league.season_year}</td>
                    <td className="p-4">
                      <Badge
                        variant={
                          league.status === 'active'
                            ? 'green'
                            : league.status === 'frozen'
                            ? 'purple'
                            : 'gray'
                        }
                      >
                        {league.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-600">
                      {formatDate(league.created_at)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => startEdit(league)}
                        className="p-2 text-gray-400 hover:text-purple-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(league.id)}
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
