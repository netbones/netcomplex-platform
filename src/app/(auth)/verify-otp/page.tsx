'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@api/client';

const OTP_EXPIRY_SECONDS = 300; // 5 minutes

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [isExpired, setIsExpired] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      setError('Code has expired. Please request a new one.');
      return;
    }
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/email-otp/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password: newPassword }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error?.message || data.message || 'Invalid or expired code');
      } else {
        router.push('/sign-in?reset=success');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'forget-password',
      });
      if (otpError) {
        setError(otpError.message || 'Failed to resend code');
      } else {
        setTimeLeft(OTP_EXPIRY_SECONDS);
        setIsExpired(false);
      }
    } catch {
      setError('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const timeColor =
    timeLeft <= 60 ? 'text-red-600' : timeLeft <= 120 ? 'text-amber-600' : 'text-gray-500';

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Request</h1>
          <p className="text-gray-600 mb-6">
            No email address provided. Please start from the forgot password page.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block text-white py-2 px-4 rounded-md"
            style={{ backgroundColor: '#4F46E5' }}
          >
            Go to Forgot Password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Verify Code</h1>
        <p className="text-gray-600 text-sm text-center mb-6">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* OTP Input */}
          <div className="mb-4">
            <label htmlFor="otp" className="block text-xs font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              ref={inputRef}
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 text-center text-3xl tracking-[0.5em] font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="000000"
              autoComplete="one-time-code"
              required
            />
          </div>

          {/* New Password */}
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-xs font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="At least 8 characters"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || isExpired}
            className="w-full text-white py-2 px-4 rounded-md disabled:opacity-50"
            style={{ backgroundColor: '#4F46E5' }}
          >
            {loading ? 'Verifying...' : 'Verify & Reset'}
          </button>
        </form>

        {/* Countdown Timer */}
        <div className="mt-3 text-center">
          {isExpired ? (
            <p className="text-sm text-red-600 font-medium">Code expired — request a new one</p>
          ) : (
            <p className={`text-sm font-mono ${timeColor}`}>
              Code expires in {formatTime(timeLeft)}
            </p>
          )}
        </div>

        {/* Resend Link */}
        <div className="mt-3 text-center">
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-sm text-indigo-600 hover:underline disabled:opacity-50 bg-transparent border-none cursor-pointer"
          >
            Resend Code
          </button>
        </div>

        <div className="mt-6 text-center text-sm">
          <Link href="/forgot-password" className="text-gray-500 hover:underline">
            Try a different email
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
