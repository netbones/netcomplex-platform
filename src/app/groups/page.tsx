'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { INTEREST_CATEGORIES } from '@shared/lib';
import { usePageLoading } from '@shared/ui';
import { trpc } from '@api/client';

import { Loader2, Users } from 'lucide-react';
interface Group {
  id: string;
  name: string;
  description: string | null;
  category: string;
  accessType: 'OPEN' | 'INVITE_ONLY' | 'APPLICATION';
  residentFilter: 'ALL' | 'OWNERS_ONLY' | 'RENTERS_ONLY';
  color: string;
  owner: { name: string | null };
  _count: { members: number };
}

export default function GroupsHubPage() {
  const { t } = useTranslation(['common', 'groups']);
  const { data: envelope, isLoading } = trpc.groups.listGroups.useQuery();
  const groups: Group[] = (envelope?.data ?? []) as Group[];
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccess, setSelectedAccess] = useState('all');

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Groups', href: '/groups' },
    ],
    { additionalLoading: isLoading }
  );

  // Resident type filtering removed - now handled by group access control

  const filteredGroups = Array.isArray(groups)
    ? groups.filter(g => {
        const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
        const matchesAccess = selectedAccess === 'all' || g.accessType === selectedAccess;
        return matchesCategory && matchesAccess;
      })
    : [];

  const accessTypeLabel = (type: string) => {
    if (type === 'OPEN') return t('groups:accessType.OPEN');
    if (type === 'INVITE_ONLY') return t('groups:accessType.INVITE_ONLY');
    if (type === 'APPLICATION') return t('groups:accessType.APPLICATION');
    return type;
  };

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.groups') }]} />
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('groups:title')}</h1>
          <p className="text-gray-600">{t('groups:subtitle')}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('groups:allGroups')}
          </button>
          {INTEREST_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full capitalize ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="text-sm text-gray-600 py-2">{t('groups:access')}</span>
          <button
            onClick={() => setSelectedAccess('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedAccess === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedAccess('OPEN')}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedAccess === 'OPEN'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setSelectedAccess('INVITE_ONLY')}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedAccess === 'INVITE_ONLY'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Invite Only
          </button>
          <button
            onClick={() => setSelectedAccess('APPLICATION')}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedAccess === 'APPLICATION'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Apply
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map(group => (
            <div
              key={group.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color || '#4F46E5' }}
                  ></span>
                  <span className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full capitalize">
                    {group.category.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      group.accessType === 'OPEN'
                        ? 'bg-green-100 text-green-800'
                        : group.accessType === 'INVITE_ONLY'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {accessTypeLabel(group.accessType)}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center">
                    <Users className="mr-1" />
                    {group._count.members}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{group.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {group.description || 'No description yet'}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Led by {group.owner.name}</span>
                <Link
                  href={`/groups/${group.id}`}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                >
                  View Group
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="text-4xl mb-4" />
            <p>No groups found in this category</p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
