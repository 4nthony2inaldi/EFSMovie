'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Film, Loader2, Plus, Pencil, Trash2, Search, Download, Globe, Check, X, RefreshCw, DollarSign } from 'lucide-react';

interface Movie {
  id: string;
  title: string;
  release_month: number;
  release_year: number;
  poster_url: string | null;
  domestic_box_office: number;
  theater_count: number | null;
  metacritic_score: number | null;
  calculated_score: number;
  tmdb_id?: number;
  imdb_id?: string;
  box_office_updated_at?: string;
}

interface TMDBMovie {
  tmdb_id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_url: string | null;
  backdrop_url: string | null;
  genre: string;
  popularity: number;
  vote_average: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function LeagueMoviesPage() {
  const supabase = createClient();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTMDB, setShowTMDB] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');

  // TMDB state
  const [tmdbMovies, setTmdbMovies] = useState<TMDBMovie[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [tmdbMonth, setTmdbMonth] = useState(new Date().getMonth() + 1);
  const [tmdbYear, setTmdbYear] = useState(new Date().getFullYear());
  const [importingIds, setImportingIds] = useState<Set<number>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [bulkRefreshing, setBulkRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    release_month: new Date().getMonth() + 1,
    release_year: new Date().getFullYear(),
    poster_url: '',
    domestic_box_office: 0,
    theater_count: 0,
    metacritic_score: '',
  });

  useEffect(() => {
    loadMovies();
  }, []);

  // Track which TMDB movies are already imported
  useEffect(() => {
    const imported = new Set(
      movies
        .filter((m) => m.tmdb_id)
        .map((m) => m.tmdb_id!)
    );
    setImportedIds(imported);
  }, [movies]);

  async function loadMovies() {
    const { data } = await supabase
      .from('movies')
      .select('*')
      .order('release_year', { ascending: false })
      .order('release_month', { ascending: false });

    setMovies(data || []);
    setLoading(false);
  }

  async function loadTMDBMovies() {
    setTmdbLoading(true);
    setTmdbError(null);
    try {
      // Add cache-busting timestamp to bypass Vercel edge cache
      const cacheBuster = Date.now();
      const response = await fetch(`/api/tmdb/upcoming?year=${tmdbYear}&month=${tmdbMonth}&_t=${cacheBuster}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.error) {
        // Include debug info if available
        const debugInfo = data.debug ? ` [Debug: envVars=${JSON.stringify(data.debug.relevantEnvVars)}]` : '';
        setTmdbError(data.error + debugInfo);
        setTmdbMovies([]);
      } else {
        setTmdbMovies(data.movies || []);
      }
    } catch (error) {
      console.error('Failed to load TMDB movies:', error);
      setTmdbError('Network error - failed to connect to TMDB');
    }
    setTmdbLoading(false);
  }

  async function importTMDBMovie(tmdbMovie: TMDBMovie) {
    setImportingIds((prev) => new Set(prev).add(tmdbMovie.tmdb_id));

    try {
      // Parse release date
      const releaseDate = new Date(tmdbMovie.release_date);
      const releaseMonth = releaseDate.getMonth() + 1;
      const releaseYear = releaseDate.getFullYear();

      // Fetch full details
      const detailsResponse = await fetch(`/api/tmdb/movie/${tmdbMovie.tmdb_id}`);
      const details = await detailsResponse.json();

      // Insert into database
      const { error } = await supabase.from('movies').insert({
        title: tmdbMovie.title,
        tmdb_id: tmdbMovie.tmdb_id,
        release_date: tmdbMovie.release_date,
        release_month: releaseMonth,
        release_year: releaseYear,
        poster_url: tmdbMovie.poster_url,
        backdrop_url: tmdbMovie.backdrop_url,
        genre: tmdbMovie.genre,
        synopsis: details.synopsis || tmdbMovie.overview,
        runtime_minutes: details.runtime_minutes,
        director: details.director,
        cast_list: details.cast_list,
        trailer_url: details.trailer_url,
      });

      if (error) throw error;

      setImportedIds((prev) => new Set(prev).add(tmdbMovie.tmdb_id));
      loadMovies();
    } catch (error) {
      console.error('Failed to import movie:', error);
      alert('Failed to import movie');
    }

    setImportingIds((prev) => {
      const next = new Set(prev);
      next.delete(tmdbMovie.tmdb_id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const movieData = {
      title: formData.title,
      release_month: formData.release_month,
      release_year: formData.release_year,
      poster_url: formData.poster_url || null,
      domestic_box_office: formData.domestic_box_office || 0,
      theater_count: formData.theater_count || 0,
      metacritic_score: formData.metacritic_score ? parseFloat(formData.metacritic_score) : null,
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
      release_month: new Date().getMonth() + 1,
      release_year: new Date().getFullYear(),
      poster_url: '',
      domestic_box_office: 0,
      theater_count: 0,
      metacritic_score: '',
    });
  }

  function startEdit(movie: Movie) {
    setFormData({
      title: movie.title,
      release_month: movie.release_month,
      release_year: movie.release_year,
      poster_url: movie.poster_url || '',
      domestic_box_office: movie.domestic_box_office || 0,
      theater_count: movie.theater_count || 0,
      metacritic_score: movie.metacritic_score?.toString() || '',
    });
    setEditingId(movie.id);
    setShowForm(true);
    setShowTMDB(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this movie?')) return;
    await supabase.from('movies').delete().eq('id', id);
    loadMovies();
  }

  async function handleDeleteAll() {
    const count = movies.length;
    if (!confirm(`Are you sure you want to delete ALL ${count} movies? This cannot be undone.`)) return;

    setBulkDeleting(true);

    // Delete all movies by their IDs
    const movieIds = movies.map(m => m.id);
    const { error } = await supabase
      .from('movies')
      .delete()
      .in('id', movieIds);

    await loadMovies();
    setBulkDeleting(false);

    if (error) {
      alert(`Delete failed: ${error.message}`);
    }
  }

  async function importAllTMDBMovies() {
    const moviesToImport = tmdbMovies.filter(m => !importedIds.has(m.tmdb_id));
    if (moviesToImport.length === 0) {
      alert('All movies are already imported!');
      return;
    }

    if (!confirm(`Import all ${moviesToImport.length} movies?`)) return;

    setBulkImporting(true);
    let successCount = 0;
    let failCount = 0;
    let lastError = '';

    for (const tmdbMovie of moviesToImport) {
      try {
        setImportingIds((prev) => new Set(prev).add(tmdbMovie.tmdb_id));

        // Parse release date
        const releaseDate = new Date(tmdbMovie.release_date);
        const releaseMonth = releaseDate.getMonth() + 1;
        const releaseYear = releaseDate.getFullYear();

        // Fetch full details
        const detailsResponse = await fetch(`/api/tmdb/movie/${tmdbMovie.tmdb_id}`);
        const details = await detailsResponse.json();

        // Insert into database
        const { error } = await supabase.from('movies').insert({
          title: tmdbMovie.title,
          tmdb_id: tmdbMovie.tmdb_id,
          release_date: tmdbMovie.release_date,
          release_month: releaseMonth,
          release_year: releaseYear,
          poster_url: tmdbMovie.poster_url,
          backdrop_url: tmdbMovie.backdrop_url,
          genre: tmdbMovie.genre,
          synopsis: details.synopsis || tmdbMovie.overview,
          runtime_minutes: details.runtime_minutes,
          director: details.director,
          cast_list: details.cast_list,
          trailer_url: details.trailer_url,
        });

        if (error) {
          failCount++;
          lastError = error.message;
          console.error(`Failed to import ${tmdbMovie.title}:`, error);
        } else {
          successCount++;
          setImportedIds((prev) => new Set(prev).add(tmdbMovie.tmdb_id));
        }
      } catch (error) {
        failCount++;
        console.error(`Failed to import ${tmdbMovie.title}:`, error);
      }

      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(tmdbMovie.tmdb_id);
        return next;
      });
    }

    setBulkImporting(false);
    loadMovies();

    if (failCount > 0) {
      alert(`Import completed: ${successCount} succeeded, ${failCount} failed.\nLast error: ${lastError}\n\nIf all failed, you may need to add an INSERT policy in Supabase.`);
    }
  }

  async function refreshBoxOffice(movie: Movie, useBrowser = false) {
    setRefreshingIds((prev) => new Set(prev).add(movie.id));

    try {
      // Use browser-based scraper if requested (for theater counts)
      const endpoint = useBrowser ? '/api/boxoffice/scrape-browser' : '/api/boxoffice/refresh';

      // Construct release date from month and year (default to 15th of month for wider search)
      const releaseDate = movie.release_month && movie.release_year
        ? `${movie.release_year}-${String(movie.release_month).padStart(2, '0')}-15`
        : undefined;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: movie.id,
          tmdbId: movie.tmdb_id,
          imdbId: movie.imdb_id,
          title: movie.title,
          releaseYear: movie.release_year,
          releaseDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Failed to refresh ${movie.title}: ${data.error}`);
      } else {
        await loadMovies();
        if (useBrowser && data.data?.theater_count) {
          alert(`Got theater count: ${data.data.theater_count.toLocaleString()} theaters`);
        }
      }
    } catch (error) {
      console.error('Refresh error:', error);
      alert(`Failed to refresh ${movie.title}`);
    }

    setRefreshingIds((prev) => {
      const next = new Set(prev);
      next.delete(movie.id);
      return next;
    });
  }

  async function refreshAllBoxOffice() {
    const moviesToRefresh = movies.filter(m => m.tmdb_id);
    if (moviesToRefresh.length === 0) {
      alert('No movies with TMDB IDs to refresh');
      return;
    }

    if (!confirm(`Refresh box office data for ${moviesToRefresh.length} movies? This may take a few minutes.`)) {
      return;
    }

    setBulkRefreshing(true);

    try {
      const response = await fetch('/api/boxoffice/refresh', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieIds: moviesToRefresh.map(m => m.id),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await loadMovies();
        alert(`Box office refresh complete: ${data.success} succeeded, ${data.failed} failed`);
      } else {
        alert(`Refresh failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Bulk refresh error:', error);
      alert('Failed to refresh box office data');
    }

    setBulkRefreshing(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Movies</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDeleteAll}
            disabled={bulkDeleting || movies.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {bulkDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete All ({movies.length})
          </button>
          <button
            onClick={refreshAllBoxOffice}
            disabled={bulkRefreshing || movies.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {bulkRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DollarSign className="h-4 w-4" />
            )}
            Refresh Box Office
          </button>
          <button
            onClick={() => {
              setShowTMDB(true);
              setShowForm(false);
              loadTMDBMovies();
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            Browse TMDB
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowForm(true);
              setShowTMDB(false);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Manual
          </button>
        </div>
      </div>

      {/* TMDB Browser */}
      {showTMDB && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Browse TMDB Movies
              </CardTitle>
              <button
                onClick={() => setShowTMDB(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <select
                value={tmdbMonth}
                onChange={(e) => setTmdbMonth(parseInt(e.target.value))}
                className="input w-40"
              >
                {MONTHS.map((month, i) => (
                  <option key={i} value={i + 1}>{month}</option>
                ))}
              </select>
              <select
                value={tmdbYear}
                onChange={(e) => setTmdbYear(parseInt(e.target.value))}
                className="input w-32"
              >
                {[2024, 2025, 2026, 2027].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button
                onClick={loadTMDBMovies}
                disabled={tmdbLoading}
                className="btn-primary flex items-center gap-2"
              >
                {tmdbLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Load Movies
              </button>
            </div>

            {/* Import All Button */}
            {tmdbMovies.length > 0 && !tmdbLoading && !tmdbError && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  {tmdbMovies.filter(m => !importedIds.has(m.tmdb_id)).length} movies available to import
                </span>
                <button
                  onClick={importAllTMDBMovies}
                  disabled={bulkImporting}
                  className="btn-primary py-1.5 px-4 text-sm flex items-center gap-2"
                >
                  {bulkImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Import All
                    </>
                  )}
                </button>
              </div>
            )}

            {tmdbLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-2" />
                <p className="text-gray-500">Loading movies from TMDB...</p>
              </div>
            ) : tmdbError ? (
              <div className="py-12 text-center">
                <div className="text-red-500 mb-2">
                  <X className="h-12 w-12 mx-auto mb-2" />
                </div>
                <p className="text-red-600 font-medium">Error loading movies</p>
                <p className="text-sm text-red-500 mt-1">{tmdbError}</p>
              </div>
            ) : tmdbMovies.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Film className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No movies found for {MONTHS[tmdbMonth - 1]} {tmdbYear}</p>
                <p className="text-sm mt-1">Try a different month or year</p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-[500px] overflow-y-auto">
                {tmdbMovies.map((movie) => {
                  const isImported = importedIds.has(movie.tmdb_id);
                  const isImporting = importingIds.has(movie.tmdb_id);

                  return (
                    <div
                      key={movie.tmdb_id}
                      className={`flex items-center gap-4 p-3 rounded-lg border ${
                        isImported ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          className="w-12 h-18 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center">
                          <Film className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{movie.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{movie.release_date}</span>
                          <span>•</span>
                          <Badge variant="gray">{movie.genre}</Badge>
                        </div>
                      </div>
                      {isImported ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <Check className="h-4 w-4" />
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => importTMDBMovie(movie)}
                          disabled={isImporting}
                          className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1"
                        >
                          {isImporting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          Import
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
            placeholder="Search movies..."
          />
        </div>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value === '' ? '' : parseInt(e.target.value))}
          className="input w-48"
        >
          <option value="">All months</option>
          {MONTHS.map((month, i) => (
            <option key={i} value={i + 1}>{month}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Movie' : 'Add New Movie'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
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
                  <label className="label">Release Month</label>
                  <select
                    value={formData.release_month}
                    onChange={(e) => setFormData({ ...formData, release_month: parseInt(e.target.value) })}
                    className="input"
                  >
                    {MONTHS.map((month, i) => (
                      <option key={i} value={i + 1}>{month}</option>
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
                    min={2024}
                    max={2030}
                  />
                </div>
                <div>
                  <label className="label">Box Office ($)</label>
                  <input
                    type="number"
                    value={formData.domestic_box_office}
                    onChange={(e) => setFormData({ ...formData, domestic_box_office: parseFloat(e.target.value) })}
                    className="input"
                    min={0}
                  />
                </div>
                <div>
                  <label className="label">Theater Count</label>
                  <input
                    type="number"
                    value={formData.theater_count}
                    onChange={(e) => setFormData({ ...formData, theater_count: parseInt(e.target.value) })}
                    className="input"
                    min={0}
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
                    placeholder="0-100"
                  />
                </div>
                <div>
                  <label className="label">Poster URL</label>
                  <input
                    type="url"
                    value={formData.poster_url}
                    onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                    className="input"
                    placeholder="https://..."
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
              <p className="text-sm mt-2">Click &quot;Browse TMDB&quot; to import real movies</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold">Movie</th>
                  <th className="text-left p-4 font-semibold">Release</th>
                  <th className="text-left p-4 font-semibold">Box Office</th>
                  <th className="text-left p-4 font-semibold">Theaters</th>
                  <th className="text-left p-4 font-semibold">Score</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovies.map((movie) => (
                  <tr key={movie.id} className="border-b border-gray-100">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center">
                            <Film className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium">{movie.title}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">
                      {MONTHS[movie.release_month - 1]} {movie.release_year}
                    </td>
                    <td className="p-4">
                      {movie.domestic_box_office > 0
                        ? formatCurrency(movie.domestic_box_office)
                        : <span className="text-gray-400">-</span>
                      }
                    </td>
                    <td className="p-4">
                      {movie.theater_count
                        ? movie.theater_count.toLocaleString()
                        : <span className="text-gray-400">-</span>
                      }
                    </td>
                    <td className="p-4">
                      <Badge variant={movie.calculated_score > 500 ? 'green' : 'gray'}>
                        {movie.calculated_score.toFixed(1)} pts
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => refreshBoxOffice(movie)}
                        disabled={refreshingIds.has(movie.id)}
                        className="p-2 text-gray-400 hover:text-green-600 disabled:opacity-50"
                        title="Quick refresh (box office + metacritic)"
                      >
                        {refreshingIds.has(movie.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => refreshBoxOffice(movie, true)}
                        disabled={refreshingIds.has(movie.id) || !movie.imdb_id}
                        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                        title="Deep scrape with browser (gets theater count)"
                      >
                        <Download className="h-4 w-4" />
                      </button>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

