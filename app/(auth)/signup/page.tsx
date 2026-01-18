'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate team name
    if (teamName.trim().length < 2) {
      setError('Team name must be at least 2 characters');
      return;
    }

    setLoading(true);

    // Sign up the user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          team_name: teamName.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user && !data.session) {
      // Email confirmation required
      setSuccess(true);
      setLoading(false);
      return;
    }

    // User signed up and confirmed, redirect to onboarding
    router.push('/onboarding');
    router.refresh();
  }

  if (success) {
    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-600 mb-4">
          We&apos;ve sent a confirmation link to <strong>{email}</strong>.
        </p>
        <p className="text-gray-600 mb-8">
          Click the link in the email to verify your account and get started.
        </p>
        <Link
          href="/login"
          className="btn-primary w-full inline-block text-center"
        >
          Back to login
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
      <p className="text-gray-600 mb-8">Join the EFS Movie League</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="teamName" className="label">
            Team Name
          </label>
          <input
            id="teamName"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="input"
            placeholder="My Awesome Team"
            required
            disabled={loading}
            maxLength={50}
          />
          <p className="text-sm text-gray-500 mt-1">
            This will be displayed on the leaderboard
          </p>
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
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
          <p className="text-sm text-gray-500 mt-1">
            Must be at least 6 characters
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirm Password
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
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-8 text-center text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
          Sign in
        </Link>
      </p>
    </>
  );
}
