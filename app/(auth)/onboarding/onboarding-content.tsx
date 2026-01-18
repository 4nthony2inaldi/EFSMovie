'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Trophy, Users, Plus, Key, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

type Step = 'team' | 'choice' | 'create-league' | 'join-league';

export function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('team');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setStep('join-league');
    }
  }, [searchParams]);

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user already has a team
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingTeam) {
        // Already onboarded, go to standings
        router.push('/standings');
        return;
      }

      setUserId(user.id);

      // Get team name from user metadata if available
      if (user.user_metadata?.team_name) {
        setTeamName(user.user_metadata.team_name);
      }

      setCheckingAuth(false);
    }

    checkAuth();
  }, [supabase, router]);

  async function handleCreateLeague() {
    if (!userId || !teamName.trim() || !leagueName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Create the league with this user as commissioner
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .insert({
          name: leagueName.trim(),
          season_year: new Date().getFullYear(),
          commissioner_user_id: userId,
          join_password: leaguePassword || null,
        })
        .select()
        .single();

      if (leagueError) throw leagueError;

      // Create the team in this league
      const { error: teamError } = await supabase
        .from('teams')
        .insert({
          league_id: league.id,
          user_id: userId,
          name: teamName.trim(),
        });

      if (teamError) throw teamError;

      // Success! Redirect to league admin
      router.push('/league/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create league');
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
        // Join via league ID + password
        if (!joinLeagueId.trim()) {
          throw new Error('Please enter a league ID');
        }

        // Validate the password
        const { data: isValid, error: validError } = await supabase
          .rpc('validate_league_password', {
            p_league_id: joinLeagueId.trim(),
            p_password: joinPassword
          });

        if (validError) throw validError;
        if (!isValid) {
          throw new Error('Invalid league ID or password');
        }

        leagueId = joinLeagueId.trim();
      }

      // Check if league has space
      const { data: teamCount } = await supabase
        .rpc('get_league_team_count', { p_league_id: leagueId });

      const { data: league } = await supabase
        .from('leagues')
        .select('max_teams')
        .eq('id', leagueId)
        .single();

      if (league && teamCount >= (league.max_teams || 12)) {
        throw new Error('This league is full');
      }

      // Create the team
      const { error: teamError } = await supabase
        .from('teams')
        .insert({
          league_id: leagueId,
          user_id: userId,
          name: teamName.trim(),
        });

      if (teamError) {
        if (teamError.code === '23505') {
          throw new Error('You are already in this league');
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

      // Success!
      router.push('/standings');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join league');
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className={`w-3 h-3 rounded-full ${step === 'team' ? 'bg-purple-600' : 'bg-purple-200'}`} />
        <div className={`w-8 h-0.5 ${step !== 'team' ? 'bg-purple-600' : 'bg-purple-200'}`} />
        <div className={`w-3 h-3 rounded-full ${step !== 'team' ? 'bg-purple-600' : 'bg-purple-200'}`} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Step 1: Team Name */}
      {step === 'team' && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Name your team</h1>
          <p className="text-gray-600 mb-8">This will be displayed on the leaderboard</p>

          <div className="mb-6">
            <label htmlFor="teamName" className="label">Team Name</label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="input"
              placeholder="My Awesome Team"
              maxLength={50}
              autoFocus
            />
          </div>

          <button
            onClick={() => {
              if (teamName.trim().length >= 2) {
                setError(null);
                setStep('choice');
              } else {
                setError('Team name must be at least 2 characters');
              }
            }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Create or Join */}
      {step === 'choice' && (
        <div>
          <button
            onClick={() => setStep('team')}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join a league</h1>
          <p className="text-gray-600 mb-8">Create your own league or join an existing one</p>

          <div className="space-y-4">
            <button
              onClick={() => setStep('create-league')}
              className="w-full p-6 bg-gradient-to-br from-purple-50 to-gold-50 border-2 border-purple-200 rounded-xl hover:border-purple-400 transition-colors text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Plus className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Create a League</h3>
                  <p className="text-sm text-gray-600">
                    Start your own league and invite friends. You&apos;ll be the commissioner.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep('join-league')}
              className="w-full p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-400 transition-colors text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-purple-100 transition-colors">
                  <Users className="h-6 w-6 text-gray-600 group-hover:text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Join a League</h3>
                  <p className="text-sm text-gray-600">
                    Join with an invite link or league ID and password
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 3a: Create League */}
      {step === 'create-league' && (
        <div>
          <button
            onClick={() => setStep('choice')}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Trophy className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create a League</h1>
              <p className="text-gray-600">You&apos;ll be the commissioner</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="leagueName" className="label">League Name</label>
              <input
                id="leagueName"
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                className="input"
                placeholder="EFS Movie League 2026"
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
          </div>

          <button
            onClick={handleCreateLeague}
            disabled={loading || !leagueName.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Creating...' : 'Create League'}
          </button>
        </div>
      )}

      {/* Step 3b: Join League */}
      {step === 'join-league' && (
        <div>
          <button
            onClick={() => {
              setStep('choice');
              setInviteCode('');
            }}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Join a League</h1>
              <p className="text-gray-600">Enter invite code or league credentials</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
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

          <div className="space-y-4 mb-6">
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
                    className="input font-mono"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
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
          </div>

          <button
            onClick={handleJoinLeague}
            disabled={loading || (joinMethod === 'invite' ? !inviteCode : !joinLeagueId)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Joining...' : 'Join League'}
          </button>
        </div>
      )}
    </div>
  );
}
