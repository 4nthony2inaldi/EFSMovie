'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, getMonthName } from '@/lib/utils';
import { Gavel, Plus, Pencil, Trash2, Loader2, Play, Square } from 'lucide-react';

interface Auction {
  id: string;
  league_id: string;
  for_month: number;
  for_year: number;
  opens_at: string;
  closes_at: string;
  status: string;
  league?: { name: string };
}

interface League {
  id: string;
  name: string;
}

export default function AdminAuctionsPage() {
  const supabase = createClient();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    league_id: '',
    for_month: 4,
    for_year: 2026,
    opens_at: '',
    closes_at: '',
    status: 'upcoming',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [auctionsRes, leaguesRes] = await Promise.all([
      supabase
        .from('auctions')
        .select('*, league:leagues(name)')
        .order('for_year', { ascending: true })
        .order('for_month', { ascending: true }),
      supabase.from('leagues').select('id, name').order('name'),
    ]);

    setAuctions(auctionsRes.data || []);
    setLeagues(leaguesRes.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const auctionData = {
      league_id: formData.league_id,
      for_month: formData.for_month,
      for_year: formData.for_year,
      opens_at: formData.opens_at,
      closes_at: formData.closes_at,
      status: formData.status,
    };

    if (editingId) {
      await supabase.from('auctions').update(auctionData).eq('id', editingId);
    } else {
      await supabase.from('auctions').insert(auctionData);
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    resetForm();
    loadData();
  }

  function resetForm() {
    setFormData({
      league_id: leagues[0]?.id || '',
      for_month: 4,
      for_year: 2026,
      opens_at: '',
      closes_at: '',
      status: 'upcoming',
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this auction?')) {
      return;
    }
    await supabase.from('auctions').delete().eq('id', id);
    loadData();
  }

  async function handleStatusChange(id: string, newStatus: string) {
    await supabase.from('auctions').update({ status: newStatus }).eq('id', id);
    loadData();
  }

  function startEdit(auction: Auction) {
    setFormData({
      league_id: auction.league_id,
      for_month: auction.for_month,
      for_year: auction.for_year,
      opens_at: auction.opens_at.slice(0, 16),
      closes_at: auction.closes_at.slice(0, 16),
      status: auction.status,
    });
    setEditingId(auction.id);
    setShowForm(true);
  }

  const statusColors: Record<string, 'gray' | 'green' | 'red' | 'purple'> = {
    upcoming: 'gray',
    open: 'green',
    closed: 'red',
    resolved: 'purple',
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Manage Auctions</h1>
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
              <div className="grid md:grid-cols-3 gap-4">
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
                <div>
                  <label className="label">For Month</label>
                  <select
                    value={formData.for_month}
                    onChange={(e) => setFormData({ ...formData, for_month: parseInt(e.target.value) })}
                    className="input"
                  >
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1].map((m) => (
                      <option key={m} value={m}>
                        {getMonthName(m)}
                      </option>
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
                <div>
                  <label className="label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
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
              <p>No auctions created yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold">Auction</th>
                  <th className="text-left p-4 font-semibold">League</th>
                  <th className="text-left p-4 font-semibold">Opens</th>
                  <th className="text-left p-4 font-semibold">Closes</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {auctions.map((auction) => (
                  <tr key={auction.id} className="border-b border-gray-100">
                    <td className="p-4">
                      <span className="font-medium">
                        {getMonthName(auction.for_month)} {auction.for_year}
                      </span>
                    </td>
                    <td className="p-4">
                      {(auction.league as unknown as { name: string })?.name || '-'}
                    </td>
                    <td className="p-4 text-gray-600">{formatDate(auction.opens_at)}</td>
                    <td className="p-4 text-gray-600">{formatDate(auction.closes_at)}</td>
                    <td className="p-4">
                      <Badge variant={statusColors[auction.status] || 'gray'}>
                        {auction.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {auction.status === 'upcoming' && (
                        <button
                          onClick={() => handleStatusChange(auction.id, 'open')}
                          className="p-2 text-gray-400 hover:text-green-600"
                          title="Open Auction"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {auction.status === 'open' && (
                        <button
                          onClick={() => handleStatusChange(auction.id, 'closed')}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Close Auction"
                        >
                          <Square className="h-4 w-4" />
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
