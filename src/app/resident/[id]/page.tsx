'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Bookshelf } from '@/components/ui/Bookshelf';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  street: string | null;
  unit: string | null;
  phone: string | null;
  interests: string[];
  avatar: string | null;
  homeImage: string | null;
  isPublic: boolean;
  residentType: string;
  role: string | null;
  createdAt: Date;
  contents: {
    id: string;
    title: string;
    excerpt: string | null;
    content: string | null;
    category: string;
    publishedAt: Date;
  }[];
}

function ProfileContent() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { t: tCommon } = useTranslation('common');
  const { data: session } = authClient.useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = session?.user?.id === id;

  useEffect(() => {
    if (!id) {
      setError('No user ID provided');
      setLoading(false);
      return;
    }

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
        {user.homeImage && (
          <div className="h-48 w-full">
            <img
              src={user.homeImage}
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
                {user.street}
                {user.unit && `, ${user.unit}`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Resident since {new Date(user.createdAt).getFullYear()}
              </p>
            </div>
          </div>

          {interestList.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {interestList.map(interest => (
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
              {user.contents.map(content => (
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
                    dangerouslySetInnerHTML={{ __html: content.content || '' }}
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
          </div>
        </div>
      )}

      <Bookshelf userId={user.id} editable={isOwnProfile} />
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
