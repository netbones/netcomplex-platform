'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@api/trpc/client';
import { Breadcrumbs } from '@shared/ui';

function MemberContent() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const {
    data: SoloSeat,
    isLoading,
    error,
  } = trpc.identity.getSoloSeat.useQuery({ id: id! }, { enabled: !!id });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-8 bg-gray-200 rounded w-64"></div>
        </div>
      </div>
    );
  }

  if (error || !SoloSeat) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Member' }]} />
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error?.message || 'Member not found'}
          </h1>
          <p className="text-gray-600 mb-6">
            The member you are looking for does not exist or is not available.
          </p>
          <Link href="/directory" className="text-soralia-primary hover:underline">
            Return to directory
          </Link>
        </div>
      </div>
    );
  }

  const { user, household } = SoloSeat;
  const isBoardMember = SoloSeat.seatType === 'MEMBER';

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Member' }]} />
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User not found</h1>
          <p className="text-gray-600 mb-6">
            The user associated with this member seat is not available.
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Directory', href: '/directory' },
          { label: user.name },
        ]}
      />

      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
        {household?.homeImage && (
          <div className="h-48 w-full">
            <img src={household.homeImage} alt="Property" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start gap-6">
            <img src={avatarUrl} alt={user.name} className="w-24 h-24 rounded-full bg-gray-100" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600 mt-1">
                {household ? `${household.street}, Unit ${household.unit}` : 'Soralia Village'}
              </p>
              <p className="text-sm text-gray-500 mt-1 font-mono">{SoloSeat.platformAddress}</p>
              <div className="flex flex-col sm:flex-row sm:gap-4 mt-3">
                {isBoardMember && (
                  <span className="bg-soralia-primary text-white text-sm px-3 py-1 rounded-full">
                    <i className="fas fa-users mr-2"></i>
                    HOA Member
                  </span>
                )}
                {SoloSeat.isComplimentary && (
                  <span className="bg-emerald-600 text-white text-sm px-3 py-1 rounded-full">
                    <i className="fas fa-star mr-2"></i>
                    Complimentary
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {user.interests && user.interests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {user.interests.map(interest => (
                <span
                  key={interest}
                  className="bg-soralia-primary text-white text-sm px-3 py-1 rounded-full"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemberPage() {
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
      <MemberContent />
    </Suspense>
  );
}
