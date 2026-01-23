'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLeague } from '@/contexts/league-context';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Loader2,
  Trophy,
  Users,
  Plus,
  Key,
  Mail,
  ArrowLeft,
  Check,
} from 'lucide-react';

type Mode = 'choice' | 'create-league' | 'join-league';

export default function JoinLeaguePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { teams, refreshTeams } = useLeague();

  const [mode, setMode] = useState<Mode>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form data
  const [teamName, setTeamName] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [leaguePassword, setLeaguePassword] = useState('');
  const [joinLeagueId, setJoinLeagueId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinMethod, setJoinMethod] = useState<'password' | 'invite'>('password');

  // Check for invite code in URL
  useEffect(() => {
    const code = searchParams.get('invite');
    if (code) {
      setInviteCode(code);
      setJoinMethod('invite');
      setMode('join-league');
    }
  }, [searchParams]);

  // Get user ID on mount
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
    }
    getUser();
  }, [supabase, router]);

  async function handleCreateLeague() {
    if (!userId || !teamName.trim() || !leagueName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Create the league with this user as commissioner
      const currentYear = new Date().getFullYear();
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .insert({
          name: leagueName.trim(),
          season_year: currentYear,
          season_end_year: currentYear,
          commissioner_user_id: userId,
          join_password: leaguePassword || null,
        })
        .select()
        .single();

      if (leagueError) {
        throw new Error(leagueError.message || 'Failed to create league');
      }

      // Create the team in this league
      const { error: teamError } = await supabase
        .from('teams')
        .insert({
          league_id: league.id,
          user_id: userId,
          name: teamName.trim(),
        });

      if (teamError) throw teamError;

      // Refresh teams in context
      await refreshTeams();
      setSuccess(true);

      // Switch to the new team by setting cookie and refreshing
      document.cookie = `efs-selected-team-id=${league.id};path=/;max-age=31536000`;

      // Redirect to league admin
      setTimeout(() => {
        router.push('/league/admin');
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Failed to create league';
      setError(errorMessage);
      setLoading(false);
    }
  }

  async function handleJoinLeague() {
    if (!userId || !teamName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let leagueId: string;
      let invitationId: string | null = null;

      if (joinMethod === 'invite' && inviteCode) {
        // Join via invite code
        const { data: inviteData, error: inviteError } = await supabase
          .rpc('get_league_by_invite', { p_invite_code: inviteCode });

        if (inviteError || !inviteData || inviteData.length === 0) {
          throw new Error('Invalid or expired invite code');
        }

        leagueId = inviteData[0].league_id;
        invitationId = inviteData[0].invitation_id;
      } else {
        // Join via league ID/slug + password
        if (!joinLeagueId.trim()) {
          throw new Error('Please enter a league ID');
        }

        // Validate the password
        const { data: validLeagueId, error: validError } = await supabase
          .rpc('validate_league_password_v2', {
            p_league_identifier: joinLeagueId.trim(),
            p_password: joinPassword
          });

        if (validError) throw validError;
        if (!validLeagueId) {
          throw new Error('Invalid league ID or password');
        }

        leagueId = validLeagueId;
      }

      // Check if already in this league
      const existingTeam = teams.find(t => t.league_id === leagueId);
      if (existingTeam) {
        throw new Error('You already have a team in this league');
      }

      // Check if league has space
      const { data: teamCount } = await supabase
        .rpc('get_league_team_count', { p_league_id: leagueId });

      const { data: league } = await supabase
        .from('leagues')
        .select('max_teams, name')
        .eq('id', leagueId)
        .single();

      if (league && teamCount >= (league.max_teams || 12)) {
        throw new Error('This league is full');
      }

      // Create the team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          league_id: leagueId,
          user_id: userId,
          name: teamName.trim(),
        })
        .select()
        .single();

      if (teamError) {
        if (teamError.code === '23505') {
          throw new Error('You already have a team in this league');
        }
        throw teamError;
      }

      // Mark invitation as accepted if using invite
      if (invitationId) {
        await supabase
          .from('league_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invitationId);
      }

      // Refresh teams and switch to new team
      await refreshTeams();
      setSuccess(true);

      // Set cookie to switch to new team
      if (newTeam) {
        document.cookie = `efs-selected-team-id=${newTeam.id};path=/;max-age=31536000`;
        localStorage.setItem('efs-selected-team-id', newTeam.id);
      }

      // Redirect to standings
      setTimeout(() => {
        window.location.href = '/standings';
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join league');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <>
        <Header title="Success!" subtitle="You're all set" />
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {mode === 'create-league' ? 'League Created!' : 'Joined League!'}
            </h2>
            <p className="text-gray-600">
              Redirecting you now...
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <Link
        href="/standings"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Standings
      </Link>

      <Header
        title="Join or Create a League"
        subtitle="Expand your movie league empire"
      />

      <div className="max-w-md mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Choice Mode */}
        {mode === 'choice' && (
          <div className="space-y-4">
            <p className="text-gray-600 mb-6">
              You&apos;re currently in {teams.length} league{teams.length !== 1 ? 's' : ''}.
              You can create a new league or join an existing one.
            </p>

            <button
              onClick={() => setMode('create-league')}
              className="w-full p-6 bg-gradient-to-br from-purple-50 to-gold-50 border-2 border-purple-200 rounded-xl hover:border-purple-400 transition-colors text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Plus className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Create a New League</h3>
                  <p className="text-sm text-gray-600">
                    Start a fresh league and invite friends. You&apos;ll be the commissioner.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('join-league')}
              className="w-full p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-400 transition-colors text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-purple-100 transition-colors">
                  <Users className="h-6 w-6 text-gray-600 group-hover:text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Join an Existing League</h3>
                  <p className="text-sm text-gray-600">
                    Join with an invite link or league ID and password
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Create League Mode */}
        {mode === 'create-league' && (
          <Card>
            <CardHeader>
              <button
                onClick={() => setMode('choice')}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Create a League</CardTitle>
                  <p className="text-sm text-gray-600">You&apos;ll be the commissioner</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="teamName" className="label">Your Team Name</label>
                <input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="input"
                  placeholder="My Awesome Team"
                  maxLength={50}
                />
              </div>

              <div>
                <label htmlFor="leagueName" className="label">League Name</label>
                <input
                  id="leagueName"
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  className="input"
                  placeholder="Fantasy Movie League 2026"
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="leaguePassword" className="label">
                  Join Password <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="leaguePassword"
                  type="text"
                  value={leaguePassword}
                  onChange={(e) => setLeaguePassword(e.target.value)}
                  className="input"
                  placeholder="Set a password for others to join"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Others can join with your league ID + this password
                </p>
              </div>

              <button
                onClick={handleCreateLeague}
                disabled={loading || !leagueName.trim() || !teamName.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Creating...' : 'Create League'}
              </button>
            </CardContent>
          </Card>
        )}

        {/* Join League Mode */}
        {mode === 'join-league' && (
          <Card>
            <CardHeader>
              <button
                onClick={() => {
                  setMode('choice');
                  setInviteCode('');
                }}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Join a League</CardTitle>
                  <p className="text-sm text-gray-600">Enter invite code or credentials</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="teamName" className="label">Your Team Name</label>
                <input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="input"
                  placeholder="My Awesome Team"
                  maxLength={50}
                />
              </div>

              {/* Tab switcher */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setJoinMethod('invite')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    joinMethod === 'invite'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  Invite Code
                </button>
                <button
                  onClick={() => setJoinMethod('password')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    joinMethod === 'password'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Key className="h-4 w-4" />
                  League ID
                </button>
              </div>

              {joinMethod === 'invite' ? (
                <div>
                  <label htmlFor="inviteCode" className="label">Invite Code</label>
                  <input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="input font-mono"
                    placeholder="Paste your invite code"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Get this from your league commissioner
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="joinLeagueId" className="label">League ID</label>
                    <input
                      id="joinLeagueId"
                      type="text"
                      value={joinLeagueId}
                      onChange={(e) => setJoinLeagueId(e.target.value)}
                      className="input"
                      placeholder="my-league or UUID"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the custom ID or full UUID from your commissioner
                    </p>
                  </div>
                  <div>
                    <label htmlFor="joinPassword" className="label">Password</label>
                    <input
                      id="joinPassword"
                      type="password"
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      className="input"
                      placeholder="League password"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleJoinLeague}
                disabled={loading || !teamName.trim() || (joinMethod === 'invite' ? !inviteCode : !joinLeagueId)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Joining...' : 'Join League'}
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
