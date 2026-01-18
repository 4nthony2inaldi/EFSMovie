'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatScore, formatBoxOffice } from '@/lib/scoring';
import { getMonthName } from '@/lib/utils';
import { Film, Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';

interface Movie {
  id: string;
  title: string;
  release_month: number;
  release_year: number;
  release_date: string | null;
  genre: string | null;
  director: string | null;
  metacritic_score: number | null;
  domestic_box_office: number;
  theater_count: number;
  calculated_score: number;
}

export default function AdminMoviesPage() {
  const supabase = createClient();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [formData, setFormData] = useState({
    title: '',
    release_month: 4,
    release_year: 2026,
    release_date: '',
    genre: '',
    director: '',
    metacritic_score: '',
    domestic_box_office: 0,
    theater_count: 0,
    oscar_nominations: 0,
    oscar_wins: 0,
    best_picture_nominated: false,
    best_picture_won: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMovies();
  }, []);

  async function loadMovies() {
    const { data } = await supabase
      .from('movies')
      .select('*')
      .order('release_year', { ascending: true })
      .order('release_month', { ascending: true })
      .order('title', { ascending: true });
    setMovies(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const movieData = {
      title: formData.title,
      release_month: formData.release_month,
      release_year: formData.release_year,
      release_date: formData.release_date || null,
      genre: formData.genre || null,
      director: formData.director || null,
      metacritic_score: formData.metacritic_score ? parseFloat(formData.metacritic_score) : null,
      domestic_box_office: formData.domestic_box_office,
      theater_count: formData.theater_count,
      oscar_nominations: formData.oscar_nominations,
      oscar_wins: formData.oscar_wins,
      best_picture_nominated: formData.best_picture_nominated,
      best_picture_won: formData.best_picture_won,
    };

    if (editingId) {
      await supabase.from('movies').update(movieData).eq('id', editingId);
    } else {
      await supabase.from('movies').insert(movieData);
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    resetForm();
    loadMovies();
  }

  function resetForm() {
    setFormData({
      title: '',
      release_month: 4,
      release_year: 2026,
      release_date: '',
      genre: '',
      director: '',
      metacritic_score: '',
      domestic_box_office: 0,
      theater_count: 0,
      oscar_nominations: 0,
      oscar_wins: 0,
      best_picture_nominated: false,
      best_picture_won: false,
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this movie?')) {
      return;
    }
    await supabase.from('movies').delete().eq('id', id);
    loadMovies();
  }

  function startEdit(movie: Movie) {
    setFormData({
      title: movie.title,
      release_month: movie.release_month,
      release_year: movie.release_year,
      release_date: movie.release_date || '',
      genre: movie.genre || '',
      director: movie.director || '',
      metacritic_score: movie.metacritic_score?.toString() || '',
      domestic_box_office: movie.domestic_box_office,
      theater_count: movie.theater_count,
      oscar_nominations: 0,
      oscar_wins: 0,
      best_picture_nominated: false,
      best_picture_won: false,
    });
    setEditingId(movie.id);
    setShowForm(true);
  }

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(search.toLowerCase());
    const matchesMonth = filterMonth === '' || movie.release_month === filterMonth;
    return matchesSearch && matchesMonth;
  });

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
        <h1 className="text-2xl font-bold text-gray-900">Manage Movies ({movies.length})</h1>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Movie
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search movies..."
            className="input pl-10"
          />
        </div>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : '')}
          className="input w-40"
        >
          <option value="">All Months</option>
          {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1].map((m) => (
            <option key={m} value={m}>
              {getMonthName(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Movie' : 'Add New Movie'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Genre</label>
                  <input
                    type="text"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="input"
                    placeholder="Action, Drama, etc."
                  />
                </div>
                <div>
                  <label className="label">Release Month</label>
                  <select
                    value={formData.release_month}
                    onChange={(e) => setFormData({ ...formData, release_month: parseInt(e.target.value) })}
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
                  <label className="label">Release Year</label>
                  <input
                    type="number"
                    value={formData.release_year}
                    onChange={(e) => setFormData({ ...formData, release_year: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Release Date</label>
                  <input
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Director</label>
                  <input
                    type="text"
                    value={formData.director}
                    onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Metacritic Score</label>
                  <input
                    type="number"
                    value={formData.metacritic_score}
                    onChange={(e) => setFormData({ ...formData, metacritic_score: e.target.value })}
                    className="input"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="label">Box Office ($)</label>
                  <input
                    type="number"
                    value={formData.domestic_box_office}
                    onChange={(e) => setFormData({ ...formData, domestic_box_office: parseFloat(e.target.value) || 0 })}
                    className="input"
                    min={0}
                  />
                </div>
                <div>
                  <label className="label">Theater Count</label>
                  <input
                    type="number"
                    value={formData.theater_count}
                    onChange={(e) => setFormData({ ...formData, theater_count: parseInt(e.target.value) || 0 })}
                    className="input"
                    min={0}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Update' : 'Add'} Movie
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

      {/* Movies List */}
      <Card>
        <CardContent className="p-0">
          {filteredMovies.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Film className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No movies found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-4 font-semibold">Title</th>
                    <th className="text-left p-4 font-semibold">Release</th>
                    <th className="text-left p-4 font-semibold">Genre</th>
                    <th className="text-right p-4 font-semibold">Metacritic</th>
                    <th className="text-right p-4 font-semibold">Box Office</th>
                    <th className="text-right p-4 font-semibold">Score</th>
                    <th className="text-right p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovies.map((movie) => (
                    <tr key={movie.id} className="border-b border-gray-100">
                      <td className="p-4 font-medium">{movie.title}</td>
                      <td className="p-4">
                        <Badge variant="default">
                          {getMonthName(movie.release_month)} {movie.release_year}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-600">{movie.genre || '-'}</td>
                      <td className="p-4 text-right">{movie.metacritic_score || '-'}</td>
                      <td className="p-4 text-right">{formatBoxOffice(movie.domestic_box_office)}</td>
                      <td className="p-4 text-right font-semibold">{formatScore(movie.calculated_score)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => startEdit(movie)}
                          className="p-2 text-gray-400 hover:text-purple-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(movie.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
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
