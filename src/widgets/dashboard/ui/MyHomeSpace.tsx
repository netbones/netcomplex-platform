'use client';

import { useState, useEffect, useCallback } from 'react';
import { authClient } from '@api/client';
import { ErrorBoundary, ImageUpload } from '@shared/ui';
import { Home as HomeIcon, Users, User, Pencil } from 'lucide-react';

/** User profile data shape from /api/users/[id] */
interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  image?: string;
  avatar?: string;
  platformAddress?: string;
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

  // Edit states
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

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
      setEditName(data.name ?? '');
      setEditPhone(data.phone ?? '');
      setEditAvatar(data.avatar ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, phone: editPhone }),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      setEditingSection(null);
      fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleAvatarChange = async (url: string) => {
    if (!userId) return;
    setEditAvatar(url);
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: url, image: url }),
    });
    await authClient.updateUser({ image: url });
    fetchProfile();
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
          </div>
          {editingSection !== 'profile' && (
            <button
              onClick={() => setEditingSection('profile')}
              className="flex items-center gap-1 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
        <div className="p-6">
          {editingSection === 'profile' ? (
            <div className="space-y-4">
              <ImageUpload value={editAvatar} onChange={handleAvatarChange} label="Profile Photo" />
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email ?? ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  Platform Address
                </label>
                <input
                  type="text"
                  value={profile?.platformAddress ?? ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-sm text-gray-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-4">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name ?? ''}
                    className="w-16 h-16 rounded-full object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-8 h-8 text-indigo-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {profile?.name ?? 'Not set'}
                  </p>
                  <p className="text-xs text-gray-500">{profile?.email ?? 'Not set'}</p>
                </div>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Platform Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {profile?.platformAddress || 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile?.phone ?? 'Not set'}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
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
