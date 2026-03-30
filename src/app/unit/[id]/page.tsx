'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

interface Profile {
  id: string;
  displayName: string;
  profileAddress: string;
  avatar: string | null;
  occupantType: string;
  status: string;
  occupantSince: Date;
}

interface StandardSeat {
  id: string;
  isPrimaryOwner: boolean;
  platformAddress: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

interface Household {
  id: string;
  street: string;
  unit: string;
  platformAddress: string;
  homeImage: string | null;
  status: string;
  standardSeats: StandardSeat[];
  profiles: Profile[];
}

function HouseholdContent() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { t: tCommon } = useTranslation('common');
  const { data: session } = authClient.useSession();

  const {
    data: household,
    isLoading,
    error,
  } = trpc.identity.getHousehold.useQuery({ id: id! }, { enabled: !!id });

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

  if (error || !household) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: tCommon('nav.home'), href: '/' }, { label: 'Household' }]} />
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error?.message || 'Household not found'}
          </h1>
          <p className="text-gray-600 mb-6">
            The household you are looking for does not exist or is not available.
          </p>
          <Link href="/directory" className="text-soralia-primary hover:underline">
            Return to directory
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = household.standardSeats.some(s => s.user.id === session?.user?.id);
  const avatarColors = [
    'bg-indigo-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-purple-600',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: tCommon('nav.home'), href: '/' },
          { label: tCommon('nav.directory'), href: '/directory' },
          { label: `Unit ${household.unit}` },
        ]}
      />

      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
        {household.homeImage && (
          <div className="h-48 w-full">
            <img
              src={household.homeImage}
              alt={`Unit ${household.unit}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Unit {household.unit}</h1>
              <p className="text-gray-600 mt-1">{household.street}</p>
              <p className="text-sm text-gray-500 mt-1 font-mono">{household.platformAddress}</p>
            </div>
            {isOwner && (
              <Link
                href={`/unit/${household.id}/manage`}
                className="px-4 py-2 bg-soralia-primary text-white rounded-lg hover:bg-indigo-700"
              >
                Manage Household
              </Link>
            )}
          </div>
        </div>
      </div>

      {household.standardSeats.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Owners</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {household.standardSeats.map((seat, index) => {
                const avatarUrl =
                  seat.user.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${seat.user.name.replace(' ', '')}`;
                return (
                  <div key={seat.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <img src={avatarUrl} alt={seat.user.name} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {seat.user.name}
                        {seat.isPrimaryOwner && (
                          <span className="ml-2 text-xs bg-soralia-primary text-white px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 font-mono">{seat.platformAddress}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {household.profiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Household Members</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {household.profiles.map((profile, index) => {
                const avatarUrl =
                  profile.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName.replace(' ', '')}`;
                const colorClass = avatarColors[index % avatarColors.length];
                return (
                  <Link
                    key={profile.id}
                    href={`/unit/${household.id}/member/${profile.id}`}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div
                      className={`w-12 h-12 rounded-full ${colorClass} flex items-center justify-center text-white font-bold`}
                    >
                      {profile.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{profile.displayName}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {profile.occupantType.toLowerCase()}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HouseholdPage() {
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
      <HouseholdContent />
    </Suspense>
  );
}
