'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCog, Search, Key, Loader2, Check, X, Copy, Eye, EyeOff } from 'lucide-react';

interface UserWithTeam {
  id: string;
  email: string;
  created_at: string;
  teams: {
    id: string;
    name: string;
    league: {
      id: string;
      name: string;
    } | null;
  }[];
}

export default function AdminUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<{ userId: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Fetch all teams with their users
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        user_id,
        league:leagues(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading teams:', error);
      setLoading(false);
      return;
    }

    // Get unique user IDs and fetch user details from the lookup endpoint
    const userIds = [...new Set(teams?.map(t => t.user_id) || [])];

    // Group teams by user_id
    const teamsByUser = (teams || []).reduce((acc, team) => {
      const league = Array.isArray(team.league) ? team.league[0] : team.league;
      if (!acc[team.user_id]) {
        acc[team.user_id] = [];
      }
      acc[team.user_id].push({
        id: team.id,
        name: team.name,
        league,
      });
      return acc;
    }, {} as Record<string, { id: string; name: string; league: { id: string; name: string } | null }[]>);

    // For now, we'll display user_id as we can't easily list all users without admin API on client
    // The actual user lookup happens when admin performs an action
    const usersData: UserWithTeam[] = userIds.map(userId => ({
      id: userId,
      email: '', // Will be populated via lookup
      created_at: '',
      teams: teamsByUser[userId] || [],
    }));

    setUsers(usersData);
    setLoading(false);

    // Fetch emails for users (batch lookup)
    for (const userId of userIds) {
      try {
        const response = await fetch(`/api/admin/lookup-user-by-id?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, email: data.email, created_at: data.created_at } : u
          ));
        }
      } catch (e) {
        // Silently fail for now
      }
    }
  }

  async function handleResetPassword() {
    if (!resettingUserId) return;

    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const response = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resettingUserId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResetError(data.error || 'Failed to reset password');
      } else {
        setResetSuccess({ userId: resettingUserId, password: data.temporaryPassword });
      }
    } catch (error) {
      setResetError('Network error - please try again');
    }

    setResetLoading(false);
  }

  function handleCopyPassword() {
    if (resetSuccess?.password) {
      navigator.clipboard.writeText(resetSuccess.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCloseReset() {
    setResettingUserId(null);
    setResetError(null);
    setResetSuccess(null);
    setShowPassword(false);
    setCopied(false);
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.teams.some(t => t.name.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
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
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage user accounts and reset passwords</p>
      </div>

      {/* Success Message with Password */}
      {resetSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <Check className="h-5 w-5" />
            <span className="font-medium">Temporary password generated!</span>
          </div>
          <p className="text-sm text-green-600 mb-3">
            Share this password with the user. They will be required to change it on their next login.
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-green-200 p-3">
            <code className="flex-1 font-mono text-lg">
              {showPassword ? resetSuccess.password : '••••••••••••'}
            </code>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-2 text-gray-500 hover:text-gray-700"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
            <button
              onClick={handleCopyPassword}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Copy password"
            >
              {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <button
            onClick={handleCloseReset}
            className="mt-3 text-sm text-green-700 hover:text-green-800 font-medium"
          >
            Done
          </button>
        </div>
      )}

      {/* Error Message */}
      {resetError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <X className="h-5 w-5" />
          {resetError}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10 w-full"
          placeholder="Search by email or team name..."
        />
      </div>

      {/* Reset Password Confirmation Dialog */}
      {resettingUserId && !resetSuccess && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-600" />
              Generate Temporary Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This will generate a new temporary password for the user. They will be required to change it after logging in.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              User: <span className="font-medium">{users.find(u => u.id === resettingUserId)?.email || resettingUserId}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="btn-primary flex items-center gap-2"
              >
                {resetLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate Password
              </button>
              <button
                onClick={handleCloseReset}
                className="btn-secondary"
                disabled={resetLoading}
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <UserCog className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-4 font-semibold text-sm">Email</th>
                    <th className="text-left p-4 font-semibold text-sm">Teams</th>
                    <th className="text-left p-4 font-semibold text-sm">Joined</th>
                    <th className="text-right p-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-100 ${
                        resettingUserId === user.id ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-5 w-5 text-gray-400" />
                          <span className="font-medium">
                            {user.email || <span className="text-gray-400 text-sm">Loading...</span>}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {user.teams.map((team) => (
                            <Badge key={team.id} variant="purple" className="text-xs">
                              {team.name}
                              {team.league && <span className="opacity-75"> ({team.league.name})</span>}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setResettingUserId(user.id);
                            setResetError(null);
                            setResetSuccess(null);
                          }}
                          className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 ml-auto"
                        >
                          <Key className="h-4 w-4" />
                          Reset Password
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
