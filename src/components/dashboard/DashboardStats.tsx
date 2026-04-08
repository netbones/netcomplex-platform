'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { toast } from 'sonner';

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
          <p className="text-2xl font-bold text-gray-900">{loading ? '...' : value}</p>
        </div>
        {href && (
          <i className="fas fa-chevron-right text-gray-300 group-hover:text-indigo-500 transition-colors"></i>
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
  const { t } = useTranslation('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    requests: 0,
    bookings: 0,
    messages: 0,
    notifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) {
          throw new Error('Failed to fetch stats');
        }
        const data = await res.json();
        setStats({
          requests: data.requests ?? 0,
          bookings: data.bookings ?? 0,
          messages: data.messages ?? 0,
          notifications: data.notifications ?? 0,
        });
      } catch (error) {
        toast.error('Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title={t('myRequests', 'My Requests')}
          value={stats.requests}
          icon="fa-wrench"
          color={STAT_COLORS.requests}
          href="/maintenance"
          loading={loading}
        />
        <StatCard
          title={t('myBookings', 'My Bookings')}
          value={stats.bookings}
          icon="fa-calendar-check"
          color={STAT_COLORS.bookings}
          href="/bookings"
          loading={loading}
        />
        <StatCard
          title={t('messages', 'Messages')}
          value={stats.messages}
          icon="fa-comments"
          color={STAT_COLORS.messages}
          href="/messages"
          loading={loading}
        />
        <StatCard
          title={t('notifications', 'Notifications')}
          value={stats.notifications}
          icon="fa-bell"
          color={STAT_COLORS.notifications}
          loading={loading}
        />
      </div>
    </ErrorBoundary>
  );
}
