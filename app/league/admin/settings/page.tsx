'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Settings, Loader2, Save, AlertTriangle } from 'lucide-react';

interface League {
  id: string;
  name: string;
  season_year: number;
  status: string;
  join_password: string | null;
  max_teams: number;
}

export default function LeagueSettingsPage() {
  const supabase = createClient();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [seasonYear, setSeasonYear] = useState(2026);
  const [joinPassword, setJoinPassword] = useState('');
  const [maxTeams, setMaxTeams] = useState(12);
  const [status, setStatus] = useState('active');

  useEffect(() => {
    loadLeague();
  }, []);

  async function loadLeague() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('leagues')
      .select('*')
      .eq('commissioner_user_id', user.id)
      .single();

    if (data) {
      setLeague(data);
      setName(data.name);
      setSeasonYear(data.season_year);
      setJoinPassword(data.join_password || '');
      setMaxTeams(data.max_teams || 12);
      setStatus(data.status);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!league) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from('leagues')
      .update({
        name,
        season_year: seasonYear,
        join_password: joinPassword || null,
        max_teams: maxTeams,
        status,
      })
      .eq('id', league.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">League Settings</h1>

      <form onSubmit={handleSave}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                Settings saved successfully!
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">League Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Season Year</label>
                <input
                  type="number"
                  value={seasonYear}
                  onChange={(e) => setSeasonYear(parseInt(e.target.value))}
                  className="input"
                  min={2024}
                  max={2030}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Join Password</label>
                <input
                  type="text"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="input"
                  placeholder="Leave blank for no password"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Required for players to join via League ID
                </p>
              </div>
              <div>
                <label className="label">Max Teams</label>
                <input
                  type="number"
                  value={maxTeams}
                  onChange={(e) => setMaxTeams(parseInt(e.target.value))}
                  className="input"
                  min={2}
                  max={20}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">League Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input"
              >
                <option value="active">Active</option>
                <option value="frozen">Frozen (Scores locked)</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <Card className="mt-8 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Deleting your league will permanently remove all teams, auctions, and data. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={async () => {
              if (!league) return;
              if (!confirm('Are you SURE you want to delete this league? This cannot be undone.')) return;
              if (!confirm('This will delete ALL teams, auctions, and data. Type "DELETE" to confirm.')) return;

              await supabase.from('leagues').delete().eq('id', league.id);
              window.location.href = '/onboarding';
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete League
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
