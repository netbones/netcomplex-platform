'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { INTEREST_CATEGORIES } from '@/lib/constants';

interface Group {
  id: string;
  name: string;
  description: string | null;
  category: string;
  accessType: 'OPEN' | 'INVITE_ONLY' | 'APPLICATION';
  residentFilter: 'ALL' | 'OWNERS_ONLY' | 'RENTERS_ONLY';
  owner: { name: string | null };
  _count: { members: number };
}

export default function GroupsHubPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccess, setSelectedAccess] = useState('all');

  useEffect(() => {
    fetch('/api/groups')
      .then(res => res.json())
      .then(data => {
        setGroups(data);
        setLoading(false);
      });
  }, []);

  const filteredGroups = groups.filter(g => {
    const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
    const matchesAccess = selectedAccess === 'all' || g.accessType === selectedAccess;
    return matchesCategory && matchesAccess;
  });

  const accessTypeLabel = (type: string) => {
    if (type === 'OPEN') return 'Open';
    if (type === 'INVITE_ONLY') return 'Invite Only';
    if (type === 'APPLICATION') return 'Apply';
    return type;
  };

  const residentFilterLabel = (filter: string) => {
    if (filter === 'ALL') return 'All';
    if (filter === 'OWNERS_ONLY') return 'Owners';
    if (filter === 'RENTERS_ONLY') return 'Renters';
    return filter;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Groups' }]} />
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interest Groups</h1>
        <p className="text-gray-600">Connect with neighbors who share your interests</p>
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
          All Groups
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
        <span className="text-sm text-gray-600 py-2">Access:</span>
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
              <span className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full capitalize">
                {group.category.replace('-', ' ')}
              </span>
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
                  <i className="fas fa-users mr-1"></i>
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
          <i className="fas fa-users text-4xl mb-4"></i>
          <p>No groups found in this category</p>
        </div>
      )}
    </div>
  );
}
