'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLeague } from '@/contexts/league-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Users, Loader2, Trash2, UserX, X, Check, Pencil, DollarSign, ChevronDown, ChevronUp, Film, Plus } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  user_id: string;
  budget_remaining: number;
  created_at: string;
}

interface Movie {
  id: string;
  title: string;
  release_month: number;
  release_year: number;
  calculated_score: number;
}

interface TeamMovie {
  id: string;
  movie_id: string;
  winning_bid: number;
  movie: Movie;
}

export default function LeagueTeamsPage() {
  const supabase = createClient();
  const { currentTeam } = useLeague();
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingTeamId, setConfirmingTeamId] = useState<string | null>(null);
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingBudgetTeamId, setEditingBudgetTeamId] = useState<string | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState<string>('');
  const [savingBudget, setSavingBudget] = useState(false);

  // Roster management state
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamMovies, setTeamMovies] = useState<Map<string, TeamMovie[]>>(new Map());
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loadingRoster, setLoadingRoster] = useState<string | null>(null);
  const [addingMovie, setAddingMovie] = useState(false);
  const [removingMovieId, setRemovingMovieId] = useState<string | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string>('');

  useEffect(() => {
    loadTeams();
    loadAllMovies();
  }, [currentTeam?.league_id]);

  async function loadTeams() {
    // Use the current league from context (layout already verified commissioner access)
    if (!currentTeam?.league_id) return;

    setLeagueId(currentTeam.league_id);

    // Get teams
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('league_id', currentTeam.league_id)
      .order('created_at', { ascending: true });

    setTeams(data || []);
    setLoading(false);
  }

  async function loadAllMovies() {
    const { data } = await supabase
      .from('movies')
      .select('id, title, release_month, release_year, calculated_score')
      .order('title', { ascending: true });

    setAllMovies(data || []);
  }

  async function loadTeamMovies(teamId: string) {
    setLoadingRoster(teamId);

    const { data } = await supabase
      .from('team_movies')
      .select(`
        id,
        movie_id,
        winning_bid,
        movie:movies(id, title, release_month, release_year, calculated_score)
      `)
      .eq('team_id', teamId)
      .order('winning_bid', { ascending: false });

    const movies = (data || []).map(tm => ({
      ...tm,
      movie: tm.movie as unknown as Movie
    }));

    setTeamMovies(prev => new Map(prev).set(teamId, movies));
    setLoadingRoster(null);
  }

  async function toggleRoster(teamId: string) {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(teamId);
      if (!teamMovies.has(teamId)) {
        await loadTeamMovies(teamId);
      }
    }
  }

  async function handleAddMovie(teamId: string) {
    if (!selectedMovieId) return;

    setAddingMovie(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/add-team-movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, movieId: selectedMovieId, winningBid: 0 }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to add movie');
        setAddingMovie(false);
        return;
      }

      setSelectedMovieId('');
      await loadTeamMovies(teamId);
      setAddingMovie(false);
    } catch (err) {
      setError('Network error: Failed to add movie');
      setAddingMovie(false);
    }
  }

  async function handleRemoveMovie(teamId: string, movieId: string) {
    setRemovingMovieId(movieId);
    setError(null);

    try {
      const response = await fetch('/api/admin/remove-team-movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, movieId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to remove movie');
        setRemovingMovieId(null);
        return;
      }

      await loadTeamMovies(teamId);
      setRemovingMovieId(null);
    } catch (err) {
      setError('Network error: Failed to remove movie');
      setRemovingMovieId(null);
    }
  }

  async function handleRemoveTeam(teamId: string) {
    setRemovingTeamId(teamId);
    setError(null);

    try {
      const response = await fetch('/api/admin/remove-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to remove team');
        setRemovingTeamId(null);
        setConfirmingTeamId(null);
        return;
      }

      setConfirmingTeamId(null);
      setRemovingTeamId(null);
      loadTeams();
    } catch (err) {
      setError('Network error: Failed to remove team');
      setRemovingTeamId(null);
      setConfirmingTeamId(null);
    }
  }

  function startEditingBudget(team: Team) {
    setEditingBudgetTeamId(team.id);
    setEditingBudgetValue(team.budget_remaining.toString());
    setError(null);
  }

  async function saveBudget(teamId: string) {
    setSavingBudget(true);
    setError(null);

    const newBudget = parseFloat(editingBudgetValue);
    if (isNaN(newBudget) || newBudget < 0) {
      setError('Please enter a valid budget amount');
      setSavingBudget(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/update-team-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, newBudget }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to update budget');
        setSavingBudget(false);
        return;
      }

      setEditingBudgetTeamId(null);
      setEditingBudgetValue('');
      setSavingBudget(false);
      loadTeams();
    } catch (err) {
      setError('Network error: Failed to update budget');
      setSavingBudget(false);
    }
  }

  // Get movies that the team doesn't already own
  function getAvailableMovies(teamId: string): Movie[] {
    const owned = teamMovies.get(teamId) || [];
    const ownedIds = new Set(owned.map(tm => tm.movie_id));
    return allMovies.filter(m => !ownedIds.has(m.id));
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
        <Badge variant="purple">{teams.length} teams</Badge>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {teams.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No teams yet</p>
              <p className="text-sm mt-1">Invite players to join your league</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {teams.map((team, index) => (
                <div key={team.id}>
                  {/* Team row */}
                  <div className="flex items-center p-4 hover:bg-gray-50">
                    <div className="w-8 text-gray-500">{index + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-bold text-sm">
                            {team.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </div>
                    <div className="w-32">
                      {editingBudgetTeamId === team.id ? (
                        <div className="flex items-center gap-1">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingBudgetValue}
                              onChange={(e) => setEditingBudgetValue(e.target.value)}
                              className="w-20 pl-5 pr-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveBudget(team.id);
                                if (e.key === 'Escape') setEditingBudgetTeamId(null);
                              }}
                            />
                          </div>
                          <button
                            onClick={() => saveBudget(team.id)}
                            disabled={savingBudget}
                            className="p-1 bg-green-100 text-green-600 hover:bg-green-200 rounded transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            {savingBudget ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingBudgetTeamId(null)}
                            disabled={savingBudget}
                            className="p-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={team.budget_remaining < 100 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(team.budget_remaining)}
                          </span>
                          <button
                            onClick={() => startEditingBudget(team)}
                            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                            title="Edit budget"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="w-28 text-gray-600 text-sm">
                      {new Date(team.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Roster toggle button */}
                      <button
                        onClick={() => toggleRoster(team.id)}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="Manage roster"
                      >
                        <Film className="h-4 w-4" />
                        <span>Roster</span>
                        {expandedTeamId === team.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      {/* Remove team button */}
                      {confirmingTeamId === team.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">Remove?</span>
                          <button
                            onClick={() => handleRemoveTeam(team.id)}
                            disabled={removingTeamId === team.id}
                            className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors disabled:opacity-50"
                            title="Confirm remove"
                          >
                            {removingTeamId === team.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmingTeamId(null)}
                            disabled={removingTeamId === team.id}
                            className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmingTeamId(team.id);
                            setError(null);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove from league"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded roster section */}
                  {expandedTeamId === team.id && (
                    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                      {loadingRoster === team.id ? (
                        <div className="py-4 text-center">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-purple-600" />
                        </div>
                      ) : (
                        <div className="pt-4">
                          {/* Add movie section */}
                          <div className="flex items-center gap-2 mb-4">
                            <select
                              value={selectedMovieId}
                              onChange={(e) => setSelectedMovieId(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="">Select a movie to add...</option>
                              {getAvailableMovies(team.id).map(movie => (
                                <option key={movie.id} value={movie.id}>
                                  {movie.title} ({movie.release_month}/{movie.release_year})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAddMovie(team.id)}
                              disabled={!selectedMovieId || addingMovie}
                              className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {addingMovie ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              Add
                            </button>
                          </div>

                          {/* Current movies */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">
                              Current Movies ({teamMovies.get(team.id)?.length || 0})
                            </h4>
                            {(teamMovies.get(team.id) || []).length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No movies on roster</p>
                            ) : (
                              <div className="grid gap-2">
                                {(teamMovies.get(team.id) || []).map(tm => (
                                  <div
                                    key={tm.id}
                                    className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 truncate">{tm.movie.title}</p>
                                      <p className="text-xs text-gray-500">
                                        {tm.movie.release_month}/{tm.movie.release_year} •
                                        Score: {tm.movie.calculated_score.toFixed(2)} •
                                        Bid: {formatCurrency(tm.winning_bid)}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveMovie(team.id, tm.movie_id)}
                                      disabled={removingMovieId === tm.movie_id}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                      title="Remove from roster"
                                    >
                                      {removingMovieId === tm.movie_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-gray-500 mt-4">
        To add more teams, send invites or share your league ID and password with players.
      </p>
    </div>
  );
}
