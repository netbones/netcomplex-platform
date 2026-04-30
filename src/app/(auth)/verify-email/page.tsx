'use client';

import { useState } from 'react';
import { authClient } from '@api/auth-client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailFromQuery);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('sending');
    setErrorMsg('');

    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: '/dashboard',
      });

      if (error) {
        setStatus('error');
        setErrorMsg(error.message || 'Failed to send verification email');
      } else {
        setStatus('sent');
      }
    } catch {
      setStatus('error');
      setErrorMsg('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="text-gray-600 mt-2 text-sm">
            We sent a verification link to your email address. Check your inbox and spam folder.
          </p>
        </div>

        {status === 'sent' && (
          <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
            Verification email sent! Check your inbox.
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{errorMsg}</div>
        )}

        {status !== 'sent' && (
          <form onSubmit={handleResend}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending...' : 'Resend verification email'}
            </button>
          </form>
        )}

        {status === 'sent' && (
          <button
            onClick={() => setStatus('idle')}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 mt-2"
          >
            Send again
          </button>
        )}

        <div className="mt-6 space-y-2 text-center text-sm">
          <p className="text-gray-500">
            Still can&apos;t find the email? Check your spam or junk folder.
          </p>
          <Link href="/sign-in" className="text-indigo-600 hover:underline block">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
