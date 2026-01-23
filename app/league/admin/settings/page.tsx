'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Settings, Loader2, Save, AlertTriangle } from 'lucide-react';

interface League {
  id: string;
  slug: string | null;
  name: string;
  season_year: number;
  season_end_month: number;
  season_end_year: number;
  status: string;
  join_password: string | null;
  max_teams: number;
  auto_assign_max_price: number;
  auto_assign_budget_percent: number;
  movies_per_auction: number;
  min_theaters_for_scoring: number;
  max_box_office_per_theater: number | null;
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
  const [slug, setSlug] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [seasonYear, setSeasonYear] = useState(2026);
  const [seasonEndMonth, setSeasonEndMonth] = useState(12);
  const [seasonEndYear, setSeasonEndYear] = useState(2026);
  const [joinPassword, setJoinPassword] = useState('');
  const [maxTeams, setMaxTeams] = useState(12);
  const [status, setStatus] = useState('active');
  const [autoAssignMaxPrice, setAutoAssignMaxPrice] = useState(20);
  const [autoAssignBudgetPercent, setAutoAssignBudgetPercent] = useState(5);

  // Scoring settings
  const [moviesPerAuction, setMoviesPerAuction] = useState(2);
  const [minTheatersForScoring, setMinTheatersForScoring] = useState(5);
  const [maxBoxOfficePerTheater, setMaxBoxOfficePerTheater] = useState<number | null>(15);
  const [noBoxOfficeCap, setNoBoxOfficeCap] = useState(false);

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
      setSlug(data.slug || '');
      setSeasonYear(data.season_year);
      setSeasonEndMonth(data.season_end_month || 12);
      setSeasonEndYear(data.season_end_year || data.season_year);
      setJoinPassword(data.join_password || '');
      setMaxTeams(data.max_teams || 12);
      setStatus(data.status);
      setAutoAssignMaxPrice(data.auto_assign_max_price ?? 20);
      setAutoAssignBudgetPercent(data.auto_assign_budget_percent ?? 5);
      setMoviesPerAuction(data.movies_per_auction ?? 2);
      setMinTheatersForScoring(data.min_theaters_for_scoring ?? 5);
      setMaxBoxOfficePerTheater(data.max_box_office_per_theater);
      setNoBoxOfficeCap(data.max_box_office_per_theater === null);
    }
    setLoading(false);
  }

  // Validate and format slug
  function handleSlugChange(value: string) {
    // Convert to lowercase and replace spaces/invalid chars with hyphens
    const formatted = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    setSlug(formatted);

    // Validate
    if (formatted && formatted.length < 3) {
      setSlugError('Must be at least 3 characters');
    } else if (formatted && formatted.length > 32) {
      setSlugError('Must be 32 characters or less');
    } else {
      setSlugError(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!league) return;

    // Validate slug before saving
    if (slugError) {
      setError('Please fix the League ID format');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from('leagues')
      .update({
        name,
        slug: slug || null,
        season_year: seasonYear,
        season_end_month: seasonEndMonth,
        season_end_year: seasonEndYear,
        join_password: joinPassword || null,
        max_teams: maxTeams,
        status,
        auto_assign_max_price: autoAssignMaxPrice,
        auto_assign_budget_percent: autoAssignBudgetPercent,
        movies_per_auction: moviesPerAuction,
        min_theaters_for_scoring: minTheatersForScoring,
        max_box_office_per_theater: noBoxOfficeCap ? null : maxBoxOfficePerTheater,
      })
      .eq('id', league.id);

    if (updateError) {
      // Check for unique constraint violation
      if (updateError.message.includes('idx_leagues_slug_unique') ||
          updateError.message.includes('duplicate') ||
          updateError.code === '23505') {
        setSlugError('This League ID is already taken');
        setError('This League ID is already taken. Please choose a different one.');
      } else {
        setError(updateError.message);
      }
    } else {
      setSuccess(true);
      setLeague({ ...league, slug: slug || null });
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

            <div>
              <label className="label">Season End Date (Final Auction Month)</label>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={seasonEndMonth}
                  onChange={(e) => setSeasonEndMonth(parseInt(e.target.value))}
                  className="input"
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
                <input
                  type="number"
                  value={seasonEndYear}
                  onChange={(e) => setSeasonEndYear(parseInt(e.target.value))}
                  className="input"
                  min={2024}
                  max={2030}
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                The last month that will have an auction. Teams must budget for all auctions until this date.
              </p>
            </div>

            <div>
              <label className="label">Custom League ID (for sharing)</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">efsmovie.com/join/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className={`input flex-1 ${slugError ? 'border-red-500' : ''}`}
                  placeholder="my-league"
                  maxLength={32}
                />
              </div>
              {slugError && (
                <p className="text-sm text-red-500 mt-1">{slugError}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                3-32 characters, lowercase letters, numbers, and hyphens only.
                {!slug && league?.id && (
                  <span className="block mt-1">
                    Current: <code className="bg-gray-100 px-1 rounded text-xs">{league.id}</code>
                  </span>
                )}
              </p>
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Auto-Assign Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              When teams don&apos;t submit any bids for an auction, they are auto-assigned random unowned movies.
              The price is the lesser of the max price or the budget percentage, but only if the team can still
              afford minimum bids on remaining movies for the season.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Max Auto-Assign Price ($)</label>
                <input
                  type="number"
                  value={autoAssignMaxPrice}
                  onChange={(e) => setAutoAssignMaxPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input"
                  min={0}
                  step={1}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum price per auto-assigned movie
                </p>
              </div>
              <div>
                <label className="label">Budget Percentage (%)</label>
                <input
                  type="number"
                  value={autoAssignBudgetPercent}
                  onChange={(e) => setAutoAssignBudgetPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                  className="input"
                  min={0}
                  max={100}
                  step={0.5}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Percentage of remaining budget (combined for all auto-assigned movies)
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Example:</strong> With $20 max and 5% budget, a team with $500 remaining would pay
              min($20, $500 × 5% ÷ 2) = min($20, $12.50) = <strong>$12.50 per movie</strong>.
              The system also ensures teams keep enough budget for minimum bids on remaining auctions.
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Scoring Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Customize how movies are scored in your league. These settings affect standings and team rankings.
            </p>

            <div>
              <label className="label">Movies Won Per Auction</label>
              <input
                type="number"
                value={moviesPerAuction}
                onChange={(e) => setMoviesPerAuction(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="input"
                min={1}
                max={10}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum movies each team can win per auction (1-10, default: 2)
              </p>
            </div>

            <div>
              <label className="label">Minimum Theaters for Box Office Points</label>
              <input
                type="number"
                value={minTheatersForScoring}
                onChange={(e) => setMinTheatersForScoring(Math.max(0, Math.min(1000, parseInt(e.target.value) || 0)))}
                className="input"
                min={0}
                max={1000}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Movies must be in at least this many theaters to earn box office points (default: 5).
                Set to 0 to allow all movies to earn box office points.
              </p>
            </div>

            <div>
              <label className="label">Max $ Per Theater (in thousands)</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={noBoxOfficeCap ? '' : (maxBoxOfficePerTheater ?? 15)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        setMaxBoxOfficePerTheater(val);
                        setNoBoxOfficeCap(false);
                      }
                    }}
                    className="input flex-1"
                    min={1}
                    step={1}
                    disabled={noBoxOfficeCap}
                    placeholder="15"
                  />
                  <span className="text-gray-500">× $1,000</span>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={noBoxOfficeCap}
                    onChange={(e) => {
                      setNoBoxOfficeCap(e.target.checked);
                      if (e.target.checked) {
                        setMaxBoxOfficePerTheater(null);
                      } else {
                        setMaxBoxOfficePerTheater(15);
                      }
                    }}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-gray-600">No cap (favors blockbusters)</span>
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Cap on the box office per theater component of scoring.
                Lower values favor smaller/limited release films, higher values or no cap favor wide releases.
                Default: $15k cap.
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
              <strong>Scoring Formula:</strong> Base Score = (Box Office ÷ Theaters ÷ 1000) × Metacritic Rating
              <br />
              <span className="text-purple-600">
                {noBoxOfficeCap
                  ? `With no cap, a movie earning $50k/theater would score full 50 × rating.`
                  : `With a $${maxBoxOfficePerTheater ?? 15}k cap, box office component is capped at ${maxBoxOfficePerTheater ?? 15}.`
                }
                {minTheatersForScoring > 0
                  ? ` Movies need ${minTheatersForScoring}+ theaters to earn box office points.`
                  : ' All movies earn box office points regardless of theater count.'
                }
              </span>
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
