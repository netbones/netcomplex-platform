'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@api/auth-client';
import { trpc } from '@api/trpc/client';
import { Breadcrumbs } from '@shared/ui';

function ProfileContent() {
  const params = useParams();
  const profileId = params?.profileId as string | undefined;
  const { t: tCommon } = useTranslation('common');
  const { data: session } = authClient.useSession();

  const {
    data: profile,
    isLoading,
    error,
  } = trpc.identity.getProfile.useQuery({ id: profileId! }, { enabled: !!profileId });

  if (isLoading) {
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

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: tCommon('nav.home'), href: '/' }, { label: 'Profile' }]} />
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error?.message || 'Profile not found'}
          </h1>
          <p className="text-gray-600 mb-6">
            The profile you are looking for does not exist or is not available.
          </p>
          <Link href="/directory" className="text-soralia-primary hover:underline">
            Return to directory
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl =
    profile.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName.replace(' ', '')}`;

  const tenantSince = new Date(profile.occupantSince);
  const isOwnProfile = profile.user?.id === session?.user?.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: tCommon('nav.home'), href: '/' },
          { label: tCommon('nav.directory'), href: '/directory' },
          { label: `Unit ${profile.household.unit}`, href: `/unit/${profile.household.id}` },
          { label: profile.displayName },
        ]}
      />

      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
        <div className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-soralia-primary flex items-center justify-center text-white text-3xl font-bold">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{profile.displayName}</h1>
              <p className="text-gray-600 mt-1">
                {profile.household.street}, Unit {profile.household.unit}
              </p>
              <p className="text-sm text-gray-500 mt-1 font-mono">{profile.profileAddress}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full capitalize">
                  {profile.occupantType.toLowerCase()}
                </span>
                <span className="text-sm text-gray-500">
                  Member since {tenantSince.getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-3">
            <Link
              href={`/unit/${profile.household.id}`}
              className="flex items-center gap-3 text-gray-700 hover:text-soralia-primary"
            >
              <i className="fas fa-home w-5"></i>
              <span>
                View household ({profile.household.street} Unit {profile.household.unit})
              </span>
            </Link>
          </div>
        </div>
      </div>

      {profile.isPublic && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">This profile is visible in the public directory</p>
              <span className="text-green-600 text-sm">
                <i className="fas fa-check-circle mr-1"></i>
                Public
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
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
