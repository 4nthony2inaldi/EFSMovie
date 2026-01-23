'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { Mail, Loader2, Plus, Trash2, Link as LinkIcon, Clock, CheckCircle } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  invite_code: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function LeagueInvitesPage() {
  const supabase = createClient();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  async function loadInvitations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get commissioner's league
    // Use limit(1).maybeSingle() to handle users who are commissioners of multiple leagues
    const { data: league } = await supabase
      .from('leagues')
      .select('id')
      .eq('commissioner_user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!league) return;
    setLeagueId(league.id);

    // Get invitations
    const { data } = await supabase
      .from('league_invitations')
      .select('*')
      .eq('league_id', league.id)
      .order('created_at', { ascending: false });

    setInvitations(data || []);
    setLoading(false);
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!leagueId || !email.trim()) return;

    setSending(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase
      .from('league_invitations')
      .insert({
        league_id: leagueId,
        email: email.trim().toLowerCase(),
        invited_by: user?.id,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        setError('An invitation has already been sent to this email');
      } else {
        setError(insertError.message);
      }
    } else {
      setEmail('');
      setShowForm(false);
      loadInvitations();
    }

    setSending(false);
  }

  async function handleDeleteInvite(inviteId: string) {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    await supabase.from('league_invitations').delete().eq('id', inviteId);
    loadInvitations();
  }

  function getInviteLink(code: string) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/onboarding?invite=${code}`;
    }
    return code;
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
        <h1 className="text-2xl font-bold text-gray-900">Invitations</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Invite Player
        </button>
      </div>

      {/* Create Invite Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Send Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInvite} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="player@example.com"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  They will receive a unique invite link to join your league
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-primary flex items-center gap-2"
                >
                  {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Mail className="h-4 w-4" />
                  Send Invite
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
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

      {/* Invitations List */}
      <Card>
        <CardContent className="p-0">
          {invitations.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No invitations sent yet</p>
              <p className="text-sm mt-1">Invite players to join your league</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold">Email</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Invite Link</th>
                  <th className="text-left p-4 font-semibold">Expires</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invite) => {
                  const isExpired = new Date(invite.expires_at) < new Date();
                  const isPending = invite.status === 'pending' && !isExpired;

                  return (
                    <tr key={invite.id} className="border-b border-gray-100">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{invite.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            invite.status === 'accepted'
                              ? 'green'
                              : isPending
                              ? 'purple'
                              : 'gray'
                          }
                        >
                          <span className="flex items-center gap-1">
                            {invite.status === 'accepted' ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : isPending ? (
                              <Clock className="h-3 w-3" />
                            ) : null}
                            {invite.status === 'accepted'
                              ? 'Accepted'
                              : isExpired
                              ? 'Expired'
                              : 'Pending'}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-4">
                        {isPending && (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded truncate max-w-[200px]">
                              {getInviteLink(invite.invite_code)}
                            </code>
                            <CopyButton text={getInviteLink(invite.invite_code)} />
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-gray-600 text-sm">
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        {invite.status !== 'accepted' && (
                          <button
                            onClick={() => handleDeleteInvite(invite.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Revoke invitation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
