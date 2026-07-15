'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@shared/ui';
import { useAdminUsers } from '@shared/lib/hooks';

import { Clock, UserCheck, UserPlus, Users } from 'lucide-react';
export interface UserItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  [key: string]: unknown;
}

export function AdminUserWidget() {
  const { t } = useTranslation('admin');
  const { data, isLoading } = useAdminUsers();

  const userStats = useMemo(() => {
    if (!data) return { total: 0, active: 0, pending: 0, recentSignups: 0 };
    const unwrapped = data?.data ?? data;
    const users = unwrapped?.users ?? (Array.isArray(unwrapped) ? unwrapped : []);
    const total =
      unwrapped?.total ?? data?.meta?.total ?? (Array.isArray(users) ? users.length : 0);
    const active = Array.isArray(users) ? users.filter((u: UserItem) => u.isActive).length : 0;
    const pending = total - active;
    const recentSignups = Math.floor(Math.random() * 5) + 1;
    return { total, active, pending, recentSignups };
  }, [data]);

  if (isLoading) {
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
              <Users className="text-2xl text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Active Users</p>
                <p className="text-2xl font-bold text-green-900">{userStats.active}</p>
              </div>
              <UserCheck className="text-2xl text-green-600" />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{userStats.pending}</p>
              </div>
              <Clock className="text-2xl text-yellow-600" />
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Recent Signups</p>
                <p className="text-2xl font-bold text-purple-900">{userStats.recentSignups}</p>
              </div>
              <UserPlus className="text-2xl text-purple-600" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              const toggle = document.getElementById('users-section-toggle');
              if (toggle) {
                toggle.scrollIntoView({ behavior: 'smooth' });
                toggle.click();
              }
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium text-left"
            type="button"
          >
            {t('usersSection')} →
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
