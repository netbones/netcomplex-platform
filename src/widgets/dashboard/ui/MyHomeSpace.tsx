'use client';

import { useState, useEffect, useCallback } from 'react';
import { authClient } from '@api/client';
import { ErrorBoundary } from '@shared/ui';
import { Home as HomeIcon, Users, User } from 'lucide-react';
import { TabbedProfile } from './TabbedProfile';
import type { ProfileData } from './TabbedProfile';

/** User profile data shape from /api/users/[id] */
interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  image?: string;
  avatar?: string;
  platformAddress?: string;
  profileData?: ProfileData;
  household?: {
    id: string;
    name?: string;
    property?: {
      id: string;
      address?: string;
      unitNumber?: string;
      type?: string;
    };
    members?: {
      id: string;
      name?: string;
      email?: string;
      role?: string;
    }[];
  } | null;
}

/**
 * MyHomeSpace — consolidates Property, Household, and Profile management.
 *
 * Per Q3 decision, the home space shows a consolidated view of:
 * 1. Property Details — fetched via household relation from user profile
 * 2. Household Members — members list from household
 * 3. Profile Management — user profile edit form
 *
 * Data sources:
 * - Current user profile: fetch from /api/users/[id] using session userId
 * - Household info: the /api/users/[id] response includes household and property relations
 * - Property details: accessed via household → propertyId relation on the user response
 * - Do NOT use /api/directory — that endpoint returns all residents
 */
export function MyHomeSpace() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const body = await res.json();
      const data = body.success ? body.data : body;
      const platformAddress =
        data.premiumSeat?.platformAddress ??
        data.soloSeats?.[0]?.platformAddress ??
        data.standardSeats?.[0]?.platformAddress ??
        '';
      setProfile({ ...data, platformAddress });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async (data: {
    name: string;
    email: string;
    phone: string;
    avatar: string;
    profileData: ProfileData;
  }) => {
    if (!userId) return;
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (data.avatar && data.avatar !== profile?.avatar) {
      await authClient.updateUser({ image: data.avatar });
      await authClient.getSession();
    }
    await fetchProfile();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <LoadingSection />
        <LoadingSection />
        <LoadingSection />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchProfile}
          className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const household = profile?.household;
  const property = household?.property;
  const members = household?.members ?? [];

  return (
    <div className="space-y-6">
      {/* ═══ Property Details ═══ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <HomeIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Property Details</h2>
          </div>
        </div>
        <div className="p-6">
          {property ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">{property.address ?? 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Unit</dt>
                <dd className="mt-1 text-sm text-gray-900">{property.unitNumber ?? 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{property.type ?? 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Household</dt>
                <dd className="mt-1 text-sm text-gray-900">{household?.name ?? 'N/A'}</dd>
              </div>
            </dl>
          ) : (
            <div className="text-center py-6">
              <HomeIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No property linked to your profile</p>
              <a href="/directory" className="text-sm text-indigo-600 hover:text-indigo-700">
                Browse directory →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Household Members ═══ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Household Members</h2>
          </div>
        </div>
        <div className="p-6">
          {members.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {members.map(member => (
                <li key={member.id} className="py-3 flex items-center gap-3 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name ?? 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">{member.email ?? ''}</p>
                  </div>
                  {member.role && (
                    <span className="ml-auto text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {member.role}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No household members found</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Profile Management ═══ */}
      <TabbedProfile
        name={profile?.name ?? ''}
        email={profile?.email ?? ''}
        avatar={profile?.avatar ?? profile?.image}
        phone={profile?.phone ?? ''}
        profileData={profile?.profileData ?? {}}
        onSave={handleSaveProfile}
      />
    </div>
  );
}

/** Loading skeleton for a section */
function LoadingSection() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    </div>
  );
}

/**
 * Wrapper with ErrorBoundary.
 */
export function MyHomeSpaceWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <MyHomeSpace />
    </ErrorBoundary>
  );
}
