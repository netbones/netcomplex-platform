'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ADMIN_LINKS } from '@/lib/constants';

interface Stats {
  totalUsers: number;
  activeRequests: number;
  totalGroups: number;
  totalContent: number;
}

export default function AdminDashboardPage() {
  const { t } = useTranslation('admin');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeRequests: 0,
    totalGroups: 0,
    totalContent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersRes, requestsRes, groupsRes, contentRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/maintenance'),
          fetch('/api/groups'),
          fetch('/api/content'),
        ]);
        const [users, requests, groups, content] = await Promise.all([
          usersRes.json(),
          requestsRes.json(),
          groupsRes.json(),
          contentRes.json(),
        ]);
        setStats({
          totalUsers: users.length,
          activeRequests: requests.filter((r: { status: string }) => r.status !== 'COMPLETED')
            .length,
          totalGroups: groups.length,
          totalContent: content.length,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      href: '/admin/users',
      icon: 'fa-users',
      color: 'bg-blue-500',
    },
    {
      label: 'Active Requests',
      value: stats.activeRequests,
      href: '/admin/requests',
      icon: 'fa-tools',
      color: 'bg-orange-500',
    },
    {
      label: 'Interest Groups',
      value: stats.totalGroups,
      href: '/admin/groups',
      icon: 'fa-people-roof',
      color: 'bg-green-500',
    },
    {
      label: 'Content Items',
      value: stats.totalContent,
      href: '/admin/content',
      icon: 'fa-file-alt',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('dashboard')}</h1>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading stats...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map(card => (
              <Link
                key={card.label}
                href={card.href}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center">
                  <div
                    className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center mr-4`}
                  >
                    <i className={`fas ${card.icon} text-xl text-white`}></i>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-sm text-gray-600">{card.label}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
              <div className="space-y-3">
                {ADMIN_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-700">{link.page}</span>
                    <i className="fas fa-chevron-right text-gray-400"></i>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 col-span-2">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <p className="text-gray-500 text-center py-8">Activity feed coming soon...</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
