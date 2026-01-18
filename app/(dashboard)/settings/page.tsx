'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';
import {
  User,
  Camera,
  Mail,
  Lock,
  LogOut,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [teamName, setTeamName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (team) {
        setTeam(team);
        setTeamName(team.name);
      }

      setLoading(false);
    }

    loadData();
  }, [supabase, router]);

  async function handleUpdateTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    if (teamName.trim().length < 2) {
      setError('Team name must be at least 2 characters');
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('teams')
      .update({ name: teamName.trim() })
      .eq('id', team.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTeam({ ...team, name: teamName.trim() });
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !team) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${team.id}-${Date.now()}.${fileExt}`;
      const filePath = `team-photos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update team with new photo URL
      const { error: updateError } = await supabase
        .from('teams')
        .update({ photo_url: publicUrl })
        .eq('id', team.id);

      if (updateError) {
        throw updateError;
      }

      setTeam({ ...team, photo_url: publicUrl });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Header title="Settings" subtitle="Manage your account and team" />

      <div className="max-w-2xl space-y-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="h-5 w-5" />
            Settings saved successfully!
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Team Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Team Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {team ? (
              <form onSubmit={handleUpdateTeam} className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar name={team.name} src={team.photo_url} size="xl" className="w-20 h-20" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute bottom-0 right-0 bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 disabled:opacity-50"
                      title="Change photo"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="teamName" className="label">
                      Team Name
                    </label>
                    <input
                      id="teamName"
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="input"
                      maxLength={50}
                      required
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget Remaining</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(team.budget_remaining)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </form>
            ) : (
              <p className="text-gray-600">
                You haven&apos;t joined a team yet. Contact your league commissioner to get added.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input bg-gray-50 text-gray-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="label">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !newPassword || !confirmPassword}
                className="btn-primary flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
