'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  href?: string;
}

function StatCard({ title, value, icon, href }: StatCardProps) {
  const content = (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function DashboardContent() {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const { data: session } = authClient.useSession();
  const [stats, setStats] = useState({ requests: 0, bookings: 0, messages: 0, notifications: 0 });
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
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[{ label: tCommon('nav.home'), href: '/' }, { label: tCommon('nav.dashboard') }]}
        />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">
            {t('welcome', { name: session?.user?.name ? `, ${session.user.name}` : '' })}
          </h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t('myRequests')}
            value={loading ? '...' : stats.requests}
            icon="🔧"
            href="/maintenance"
          />
          <StatCard
            title={t('myBookings')}
            value={loading ? '...' : stats.bookings}
            icon="📅"
            href="/bookings"
          />
          <StatCard
            title={t('messages')}
            value={loading ? '...' : stats.messages}
            icon="💬"
            href="/messages"
          />
          <StatCard
            title={t('notifications')}
            value={loading ? '...' : stats.notifications}
            icon="🔔"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{t('quickActions')}</h2>
            <div className="space-y-3">
              <Link
                href="/maintenance"
                className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
              >
                {t('submitRequest')}
              </Link>
              <Link
                href="/bookings"
                className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
              >
                {t('bookFacility')}
              </Link>
              <Link
                href="/directory"
                className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
              >
                {t('viewDirectory')}
              </Link>
              <Link
                href="/messages"
                className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
              >
                {t('startConversation')}
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{t('recentActivity')}</h2>
            <div className="text-center py-8 text-gray-500">
              <p>{t('noActivity')}</p>
              <p className="text-sm">{t('activityWillAppear')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t('communityEvents')}</h2>
          <div className="text-center py-8 text-gray-500">
            <p>{t('noEvents')}</p>
            <Link href="/resources" className="text-indigo-600 hover:underline">
              {t('viewAllEvents')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
