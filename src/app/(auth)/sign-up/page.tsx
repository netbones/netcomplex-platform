'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Honeypot, TurnstileWidget } from '@shared/ui';

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  // Invitation token from URL (for invited users)
  const invitationToken = searchParams.get('token') || '';
  const invitedRole = searchParams.get('role') || '';
  const isInvited = !!invitationToken;

  useEffect(() => {
    setTurnstileSiteKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '');

    // Pre-fill from invitation URL
    const emailParam = searchParams.get('email');
    const nameParam = searchParams.get('name');
    if (emailParam) setEmail(emailParam);
    if (nameParam) setName(nameParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          turnstileToken,
          invitationToken: invitationToken || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        const errMsg =
          typeof data.error === 'object' && data.error !== null
            ? (data.error as { message?: string }).message || 'Failed to sign up'
            : data.error || 'Failed to sign up';
        setError(errMsg);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        {isInvited && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-indigo-900">You're Invited!</h3>
                <p className="text-sm text-indigo-700 mt-1">
                  Create your account to join as a <strong>{invitedRole}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold text-center mb-6">
          {isInvited ? 'Accept Invitation' : 'Create Account'}
        </h1>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              readOnly={!!searchParams.get('name')}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              readOnly={!!searchParams.get('email')}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              minLength={8}
            />
          </div>

          {turnstileSiteKey && (
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              theme="auto"
              onTokenChange={setTurnstileToken}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : isInvited ? 'Create Account & Accept' : 'Sign Up'}
          </button>

          <Honeypot />
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
