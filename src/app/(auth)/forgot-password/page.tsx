'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@api/client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'forget-password',
      });

      if (otpError) {
        setError(otpError?.message || otpError || 'Failed to send verification code');
      } else {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Forgot Password</h1>
        <p className="text-gray-600 text-sm text-center mb-6">
          Enter your email address and we&apos;ll send you a 6-digit code to reset your password.
        </p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-2 px-4 rounded-md disabled:opacity-50"
            style={{ backgroundColor: '#4F46E5' }}
          >
            {loading ? 'Sending...' : 'Send Code'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link href="/sign-in" className="text-indigo-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
