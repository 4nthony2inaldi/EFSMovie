'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  // Check if user has a valid recovery session
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();

      // Supabase sets a session when user clicks the reset link
      if (session) {
        setHasValidSession(true);
      }
      setChecking(false);
    }

    checkSession();

    // Listen for auth state changes (recovery link clicked)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasValidSession(true);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600">Verifying reset link...</p>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or expired link</h1>
        <p className="text-gray-600 mb-6">
          This password reset link is invalid or has expired.
        </p>
        <Link
          href="/forgot-password"
          className="btn-primary inline-block"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Password updated!</h1>
        <p className="text-gray-600 mb-6">
          Your password has been successfully updated. Redirecting to login...
        </p>
        <Link
          href="/login"
          className="btn-primary inline-block"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Set new password</h1>
      <p className="text-gray-600 mb-8">
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="label">
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
            disabled={loading}
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
            required
            disabled={loading}
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </>
  );
}
