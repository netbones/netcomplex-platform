'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { logError } from '@/lib/logging';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  [key: string]: unknown;
}

export function AdminUserWidget() {
  const { t } = useTranslation('admin');
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    recentSignups: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserStats() {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          const users = data.users || [];
          const total = data.total || users.length || 0;

          // Ensure users is an array before calling filter
          const active = Array.isArray(users)
            ? users.filter((u: UserItem) => u.isActive).length
            : 0;
          const pending = total - active;

          // Mock recent signups (last 30 days)
          const recentSignups = Math.floor(Math.random() * 5) + 1;

          setUserStats({ total, active, pending, recentSignups });
        }
      } catch (error) {
        logError(
          { component: 'AdminUserWidget', operation: 'fetchUserStats' },
          'Failed to fetch user stats',
          error
        );
      } finally {
        setLoading(false);
      }
    }

    fetchUserStats();
  }, []);

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Users</p>
                <p className="text-2xl font-bold text-blue-900">{userStats.total}</p>
              </div>
              <i className="fas fa-users text-2xl text-blue-600"></i>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Active Users</p>
                <p className="text-2xl font-bold text-green-900">{userStats.active}</p>
              </div>
              <i className="fas fa-user-check text-2xl text-green-600"></i>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{userStats.pending}</p>
              </div>
              <i className="fas fa-clock text-2xl text-yellow-600"></i>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Recent Signups</p>
                <p className="text-2xl font-bold text-purple-900">{userStats.recentSignups}</p>
              </div>
              <i className="fas fa-user-plus text-2xl text-purple-600"></i>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href="/admin/users"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Manage Users →
          </a>
        </div>
      </div>
    </ErrorBoundary>
  );
}
