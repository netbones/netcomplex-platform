'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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
  loading?: boolean;
}

function StatCard({ title, value, icon, href, loading }: StatCardProps) {
  const content = (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{loading ? '...' : value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:scale-105 transition-transform">
        {content}
      </a>
    );
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
        const [reqRes, bookRes, msgRes, notifRes] = await Promise.all([
          fetch('/api/maintenance'),
          fetch('/api/bookings'),
          fetch('/api/conversations'),
          fetch('/api/notifications'),
        ]);

        if (!reqRes.ok || !bookRes.ok || !msgRes.ok || !notifRes.ok) {
          throw new Error('Failed to fetch stats');
        }

        const [requests, bookings, conversations, notifications] = await Promise.all([
          reqRes.json(),
          bookRes.json(),
          msgRes.json(),
          notifRes.json(),
        ]);

        setStats({
          requests: Array.isArray(requests) ? requests.length : 0,
          bookings: Array.isArray(bookings) ? bookings.length : 0,
          messages: Array.isArray(conversations) ? conversations.length : 0,
          notifications: Array.isArray(notifications) ? notifications.length : 0,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t('myRequests', 'My Requests')}
          value={stats.requests}
          icon="🔧"
          href="/maintenance"
          loading={loading}
        />
        <StatCard
          title={t('myBookings', 'My Bookings')}
          value={stats.bookings}
          icon="📅"
          href="/bookings"
          loading={loading}
        />
        <StatCard
          title={t('messages', 'Messages')}
          value={stats.messages}
          icon="💬"
          href="/messages"
          loading={loading}
        />
        <StatCard
          title={t('notifications', 'Notifications')}
          value={stats.notifications}
          icon="🔔"
          loading={loading}
        />
      </div>
    </ErrorBoundary>
  );
}
