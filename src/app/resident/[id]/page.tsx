'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { sanitizeHtml } from '@/lib/utils';

interface ResidentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  interests: string[];
  avatar: string | null;
  books: any;
  dashboardLayout: any;
  isPublic: boolean;
  showEmail: boolean;
  showPhone: boolean;
  role: string;
  createdAt: string;
  standardSeats?: Array<{
    household: {
      id: string;
      street: string;
      unit: string;
      homeImage: string | null;
    };
    isPrimaryOwner: boolean;
  }>;
  soloSeat?: {
    seatType: string;
    household?: {
      id: string;
      street: string;
      unit: string;
      homeImage: string | null;
    };
  };
  contents: Array<{
    id: string;
    title: string;
    excerpt: string | null;
    content: string;
    category: string;
    publishedAt: string | null;
  }>;
}

function ProfileContent() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { t: tCommon } = useTranslation('common');
  const { data: session } = authClient.useSession();
  const [user, setUser] = useState<ResidentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const contentsPerPage = 3;

  const isOwnProfile = session?.user?.id === id;

  useEffect(() => {
    if (!id) {
      setError('No user ID provided');
      setLoading(false);
      return;
    }

    // First try the legacy API - it always works
    fetch(`/api/users/${id}`)
      .then(async res => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('User not found');
          }
          throw new Error('Failed to load user');
        }
        return res.json();
      })
      .then(data => {
        if (!data.isPublic) {
          throw new Error('This profile is not public');
        }
        setUser(data);
      })
      .catch(err => {
        setError(err.message || 'Failed to load user');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: tCommon('nav.home'), href: '/' }, { label: 'Profile' }]} />
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || 'User not found'}</h1>
          <p className="text-gray-600 mb-6">
            {error === 'This profile is not public'
              ? 'This resident has chosen not to make their profile public.'
              : 'The profile you are looking for does not exist or is not available.'}
          </p>
          <Link href="/directory" className="text-soralia-primary hover:underline">
            Return to directory
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl =
    user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name.replace(' ', '')}`;
  const interestList = Array.isArray(user.interests) ? user.interests : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: tCommon('nav.home'), href: '/' },
          { label: tCommon('nav.directory'), href: '/directory' },
          { label: user.name },
        ]}
      />

      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
        {(user.standardSeats?.[0]?.household?.homeImage || user.soloSeat?.household?.homeImage) && (
          <div className="h-48 w-full">
            <img
              src={
                user.standardSeats?.[0]?.household?.homeImage ||
                user.soloSeat?.household?.homeImage ||
                ''
              }
              alt={`${user.name}'s home`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start gap-6">
            <img src={avatarUrl} alt={user.name} className="w-24 h-24 rounded-full bg-gray-100" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600 mt-1">
                {user.standardSeats?.[0]?.household?.street ||
                  user.soloSeat?.household?.street ||
                  'Address not available'}
                {(user.standardSeats?.[0]?.household?.unit || user.soloSeat?.household?.unit) &&
                  `, ${user.standardSeats?.[0]?.household?.unit || user.soloSeat?.household?.unit}`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Resident since {new Date(user.createdAt).getFullYear()}
              </p>
              <div className="flex flex-col sm:flex-row sm:gap-4 mt-3">
                {user.showEmail && (
                  <a
                    href={`mailto:${user.email}`}
                    className="flex items-center gap-2 text-soralia-primary hover:underline"
                  >
                    <i className="fas fa-envelope" aria-hidden="true"></i>
                    <span>{user.email}</span>
                  </a>
                )}
                {user.showPhone && user.phone && (
                  <a
                    href={`tel:${user.phone}`}
                    className="flex items-center gap-2 text-soralia-primary hover:underline"
                  >
                    <i className="fas fa-phone" aria-hidden="true"></i>
                    <span>{user.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {interestList.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {interestList.map((interest: string) => (
                  <span
                    key={interest}
                    className="bg-soralia-primary text-white text-sm px-3 py-1 rounded-full"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {user.contents && user.contents.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Published Content</h2>
            <div className="space-y-6">
              {user.contents
                .slice((page - 1) * contentsPerPage, page * contentsPerPage)
                .map((content: any) => (
                  <div
                    key={content.id}
                    className="border-b border-gray-200 pb-6 last:border-0 last:pb-0"
                  >
                    <h3 className="font-semibold text-gray-900 text-lg">{content.title}</h3>
                    {content.excerpt && (
                      <p className="text-gray-600 text-sm mt-1 mb-3">{content.excerpt}</p>
                    )}
                    <div
                      className="prose prose-sm max-w-none content-body"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.content || '') }}
                    />
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        {new Date(content.publishedAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs bg-soralia-secondary text-white px-2 py-0.5 rounded">
                        {content.category}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
            {Math.ceil(user.contents.length / contentsPerPage) > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-center gap-2">
                  {Array.from(
                    { length: Math.ceil(user.contents.length / contentsPerPage) },
                    (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`px-3 py-1 rounded ${
                          page === i + 1 ? 'bg-soralia-primary text-white' : 'bg-gray-200'
                        }`}
                      >
                        {i + 1}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResidentProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-8 bg-gray-200 rounded w-64"></div>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
