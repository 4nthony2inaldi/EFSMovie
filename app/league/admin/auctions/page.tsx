'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLeague } from '@/contexts/league-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Gavel, Loader2, Plus, Pencil, Trash2, Film, Clock, CheckCircle, PlayCircle, RefreshCw } from 'lucide-react';

interface Auction {
  id: string;
  for_month: number;
  for_year: number;
  opens_at: string;
  closes_at: string;
  status: string;
}

interface Movie {
  id: string;
  title: string;
  release_month: number;
  release_year: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function LeagueAuctionsPage() {
  const supabase = createClient();
  const { currentTeam } = useLeague();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [availableMovies, setAvailableMovies] = useState<Movie[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    for_month: new Date().getMonth() + 1,
    for_year: new Date().getFullYear(),
    opens_at: '',
    closes_at: '',
  });

  useEffect(() => {
    loadData();
  }, [currentTeam?.league_id]);

  async function loadData() {
    // Use the current league from context (layout already verified commissioner access)
    if (!currentTeam?.league_id) return;

    setLeagueId(currentTeam.league_id);

    // Get auctions
    const { data: auctionsData } = await supabase
      .from('auctions')
      .select('*')
      .eq('league_id', currentTeam.league_id)
      .order('for_year', { ascending: false })
      .order('for_month', { ascending: false });

    setAuctions(auctionsData || []);

    // Get movies
    const { data: moviesData } = await supabase
      .from('movies')
      .select('id, title, release_month, release_year')
      .order('release_year')
      .order('release_month');

    setAvailableMovies(moviesData || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leagueId) return;
    setSaving(true);

    const auctionData = {
      league_id: leagueId,
      for_month: formData.for_month,
      for_year: formData.for_year,
      opens_at: formData.opens_at,
      closes_at: formData.closes_at,
      status: 'upcoming',
    };

    let auctionId = editingId;

    try {
      if (editingId) {
        await supabase.from('auctions').update(auctionData).eq('id', editingId);
      } else {
        const { data } = await supabase.from('auctions').insert(auctionData).select().single();
        auctionId = data?.id;
      }

      // Update auction movies via API (bypasses RLS issues)
      if (auctionId) {
        const response = await fetch(`/api/auctions/${auctionId}/movies`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movie_ids: selectedMovies }),
        });

        if (!response.ok) {
          const data = await response.json();
          console.error('Failed to update auction movies:', data.error);
          alert(`Auction saved but failed to update movies: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('Error saving auction:', error);
      alert('Failed to save auction');
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    resetForm();
    loadData();
  }

  function resetForm() {
    const now = new Date();
    setFormData({
      for_month: now.getMonth() + 1,
      for_year: now.getFullYear(),
      opens_at: '',
      closes_at: '',
    });
    setSelectedMovies([]);
  }

  async function startEdit(auction: Auction) {
    setFormData({
      for_month: auction.for_month,
      for_year: auction.for_year,
      opens_at: auction.opens_at.slice(0, 16),
      closes_at: auction.closes_at.slice(0, 16),
    });
    setEditingId(auction.id);

    // Load auction movies
    const { data } = await supabase
      .from('auction_movies')
      .select('movie_id')
      .eq('auction_id', auction.id);

    setSelectedMovies(data?.map(am => am.movie_id) || []);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this auction?\n\nThis will also delete all bids and results, and refund any spent budget.')) return;

    try {
      const response = await fetch(`/api/auctions/${id}`, {
        method: 'DELETE',
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Non-JSON response:', text);
        alert(`Failed to delete: Server returned invalid response (${response.status})`);
        return;
      }

      if (!response.ok) {
        alert(`Failed to delete: ${data.error || 'Unknown error'}`);
        return;
      }

      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Failed to delete auction: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    // Get current auction to check status
    const currentAuction = auctions.find(a => a.id === id);
    const oldStatus = currentAuction?.status;

    // If resolving, call the resolve API which processes bids and assigns winners
    if (newStatus === 'resolved') {
      if (!confirm('Resolve this auction? This will process all bids and assign movies to winning teams.')) {
        return;
      }

      try {
        const response = await fetch(`/api/auctions/${id}/resolve`, {
          method: 'POST',
        });
        const data = await response.json();

        if (!response.ok) {
          alert(`Failed to resolve: ${data.error}`);
          return;
        }

        alert(`Auction resolved! ${data.assignments} movies assigned to teams.`);
      } catch (error) {
        alert('Failed to resolve auction');
        return;
      }
    } else {
      // If changing FROM resolved, warn about unassigning movies
      if (oldStatus === 'resolved') {
        if (!confirm('Unresolve this auction? This will unassign all movies and refund the winning bids back to teams.')) {
          return;
        }
      }

      // Use the PATCH endpoint which handles cleanup when unresolving
      try {
        const response = await fetch(`/api/auctions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await response.json();

        if (!response.ok) {
          alert(`Failed to update status: ${data.error}`);
          return;
        }

        if (data.unresolved) {
          alert('Auction unresolved. Movie assignments have been removed and budgets refunded.');
        }
      } catch (error) {
        alert('Failed to update auction status');
        return;
      }
    }
    loadData();
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'upcoming': return <Clock className="h-3 w-3" />;
      case 'open': return <PlayCircle className="h-3 w-3" />;
      case 'resolved': return <CheckCircle className="h-3 w-3" />;
      default: return null;
    }
  }

  // Filter movies by the selected month
  const moviesForMonth = availableMovies.filter(
    m => m.release_month === formData.for_month && m.release_year === formData.for_year
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Auctions</h1>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Auction
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Auction' : 'Create New Auction'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">For Month</label>
                  <select
                    value={formData.for_month}
                    onChange={(e) => setFormData({ ...formData, for_month: parseInt(e.target.value) })}
                    className="input"
                  >
                    {MONTHS.map((month, i) => (
                      <option key={i} value={i + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">For Year</label>
                  <input
                    type="number"
                    value={formData.for_year}
                    onChange={(e) => setFormData({ ...formData, for_year: parseInt(e.target.value) })}
                    className="input"
                    min={2024}
                    max={2030}
                  />
                </div>
                <div>
                  <label className="label">Opens At</label>
                  <input
                    type="datetime-local"
                    value={formData.opens_at}
                    onChange={(e) => setFormData({ ...formData, opens_at: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Closes At</label>
                  <input
                    type="datetime-local"
                    value={formData.closes_at}
                    onChange={(e) => setFormData({ ...formData, closes_at: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              {/* Movie Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Movies in this Auction</label>
                  {moviesForMonth.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMovies(moviesForMonth.map(m => m.id))}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Select All ({moviesForMonth.length})
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMovies([])}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Showing movies releasing in {MONTHS[formData.for_month - 1]} {formData.for_year}
                </p>
                {moviesForMonth.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                    No movies found for {MONTHS[formData.for_month - 1]} {formData.for_year}.
                    Add movies first.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {moviesForMonth.map((movie) => (
                      <label
                        key={movie.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMovies.includes(movie.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMovies([...selectedMovies, movie.id]);
                            } else {
                              setSelectedMovies(selectedMovies.filter(id => id !== movie.id));
                            }
                          }}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <Film className="h-4 w-4 text-gray-400" />
                        <span>{movie.title}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {selectedMovies.length} movies selected
                </p>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Update' : 'Create'} Auction
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

      {/* Auctions List */}
      <Card>
        <CardContent className="p-0">
          {auctions.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Gavel className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No auctions yet</p>
              <p className="text-sm mt-1">Create your first auction to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold">Month</th>
                  <th className="text-left p-4 font-semibold">Opens</th>
                  <th className="text-left p-4 font-semibold">Closes</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {auctions.map((auction) => (
                  <tr key={auction.id} className="border-b border-gray-100">
                    <td className="p-4 font-medium">
                      {MONTHS[auction.for_month - 1]} {auction.for_year}
                    </td>
                    <td className="p-4 text-gray-600">{formatDate(auction.opens_at)}</td>
                    <td className="p-4 text-gray-600">{formatDate(auction.closes_at)}</td>
                    <td className="p-4">
                      <select
                        value={auction.status}
                        onChange={(e) => handleStatusChange(auction.id, e.target.value)}
                        className="text-sm border rounded-lg px-2 py-1"
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-1">
                      {auction.status === 'resolved' && (
                        <button
                          onClick={() => handleStatusChange(auction.id, 'resolved')}
                          className="p-2 text-gray-400 hover:text-green-600"
                          title="Re-resolve auction"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(auction)}
                        className="p-2 text-gray-400 hover:text-purple-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(auction.id)}
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
