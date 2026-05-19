'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@api/auth-client';
import { useApiToast } from '@shared/lib/hooks/useApiToast';

interface InvitationData {
  id: string;
  email: string;
  name: string;
  role: string;
  residentType: string;
  status: string;
  expiresAt: string;
  tenantId: string;
  inviterId: string;
  tenantName: string;
  tenantSlug: string | null;
  inviterName: string;
}

interface ExistingUser {
  id: string;
  name: string;
  emailVerified: boolean | null;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { fetch: apiFetch } = useApiToast({ component: 'InvitePage' });
  const { data: session } = authClient.useSession();

  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [existingUser, setExistingUser] = useState<ExistingUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;

    const validateInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/validate?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid invitation');
          return;
        }

        setInvitation(data.invitation);
        setExistingUser(data.existingUser);
      } catch {
        setError('Failed to load invitation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: session?.user?.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      if (data.requiresSignup) {
        // User doesn't exist — redirect to signup with token
        const signupUrl = `/sign-up?token=${token}&email=${encodeURIComponent(data.invitation.email)}&name=${encodeURIComponent(data.invitation.name)}&role=${data.invitation.role}&tenantId=${data.invitation.tenantId}`;
        router.push(signupUrl);
        return;
      }

      // User exists — invitation accepted
      setAccepted(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch {
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-soralia-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Invitation Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-soralia-primary text-white py-2 px-4 rounded-md hover:bg-indigo-700"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to {invitation?.tenantName}!</h1>
          <p className="text-gray-600 mb-6">
            You have been added as a <strong>{invitation?.role}</strong>. Redirecting to your
            dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const isLoggedIn = !!session?.user?.id;
  const isEmailMatch = isLoggedIn && session?.user?.email === invitation.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-soralia-primary"
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
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You're Invited!</h1>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Community</span>
            <span className="text-sm font-medium text-gray-900">{invitation.tenantName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Invited by</span>
            <span className="text-sm font-medium text-gray-900">{invitation.inviterName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Role</span>
            <span className="text-sm font-medium text-gray-900">{invitation.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{invitation.email}</span>
          </div>
        </div>

        {isLoggedIn && !isEmailMatch && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              You're signed in as <strong>{session?.user?.email}</strong>, but this invitation is
              for <strong>{invitation.email}</strong>.
            </p>
            <p className="text-sm text-amber-800 mt-2">
              <Link href="/sign-in" className="text-amber-900 underline font-medium">
                Sign in with the correct email
              </Link>{' '}
              or{' '}
              <button
                onClick={() => authClient.signOut()}
                className="text-amber-900 underline font-medium"
              >
                sign out
              </button>
            </p>
          </div>
        )}

        {isLoggedIn && isEmailMatch ? (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-soralia-primary text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {accepting ? 'Accepting...' : 'Accept Invitation'}
          </button>
        ) : isLoggedIn && !isEmailMatch ? (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-md cursor-not-allowed font-medium"
            title="Sign in with the invited email to accept"
          >
            Sign in as {invitation.email} to accept
          </button>
        ) : (
          <div className="space-y-3">
            <Link
              href={`/sign-up?token=${token}&email=${encodeURIComponent(invitation.email)}&name=${encodeURIComponent(invitation.name)}&role=${invitation.role}&tenantId=${invitation.tenantId}`}
              className="block w-full bg-soralia-primary text-white py-3 px-4 rounded-md hover:bg-indigo-700 text-center font-medium"
            >
              Create Account & Accept
            </Link>
            <Link
              href={`/sign-in?email=${encodeURIComponent(invitation.email)}`}
              className="block w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 text-center font-medium"
            >
              Sign In to Accept
            </Link>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          This invitation expires on{' '}
          {new Date(invitation.expiresAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
    </div>
  );
}
