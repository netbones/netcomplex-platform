'use client';

import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
import { ErrorBoundary } from '@shared/ui';
import { useDashboardStats } from '@features/dashboard';

import { ChevronRight } from 'lucide-react';
interface DashboardStats {
  requests: number;
  bookings: number;
  messages: number;
  notifications: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  href?: string;
  color?: string;
  loading?: boolean;
}

const STAT_COLORS: Record<string, string> = {
  requests: 'bg-orange-100 text-orange-600',
  bookings: 'bg-blue-100 text-blue-600',
  messages: 'bg-purple-100 text-purple-600',
  notifications: 'bg-yellow-100 text-yellow-600',
};

function StatCard({
  title,
  value,
  icon,
  href,
  color = 'bg-gray-100 text-gray-600',
  loading,
}: StatCardProps) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 group">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}
        >
          <i className={`fas ${icon} text-lg`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-lg font-bold text-gray-900">{loading ? '...' : value}</p>
        </div>
        {href && (
          <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function DashboardStats() {
  const { tx } = useSafeTranslation('dashboard');
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title={tx('myRequests', 'My Requests')}
          value={stats?.requests ?? 0}
          icon="fa-wrench"
          color={STAT_COLORS.requests}
          href="/maintenance"
          loading={isLoading}
        />
        <StatCard
          title={tx('myBookings', 'My Bookings')}
          value={stats?.bookings ?? 0}
          icon="fa-calendar-check"
          color={STAT_COLORS.bookings}
          href="/bookings"
          loading={isLoading}
        />
        <StatCard
          title={tx('messages', 'Messages')}
          value={stats?.messages ?? 0}
          icon="fa-comments"
          color={STAT_COLORS.messages}
          href="/messages"
          loading={isLoading}
        />
        <StatCard
          title={tx('notifications', 'Notifications')}
          value={stats?.notifications ?? 0}
          icon="fa-bell"
          color={STAT_COLORS.notifications}
          loading={isLoading}
        />
      </div>
    </ErrorBoundary>
  );
}
