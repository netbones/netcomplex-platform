'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
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
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]} />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}!
          </h1>
          <p className="text-gray-600">Here's what's happening in your community.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="My Requests"
            value={loading ? '...' : stats.requests}
            icon="🔧"
            href="/maintenance"
          />
          <StatCard
            title="My Bookings"
            value={loading ? '...' : stats.bookings}
            icon="📅"
            href="/bookings"
          />
          <StatCard
            title="Messages"
            value={loading ? '...' : stats.messages}
            icon="💬"
            href="/messages"
          />
          <StatCard title="Notifications" value={loading ? '...' : stats.notifications} icon="🔔" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/maintenance"
                className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
              >
                Submit Maintenance Request
              </Link>
              <Link
                href="/bookings"
                className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
              >
                Book Community Facility
              </Link>
              <Link
                href="/directory"
                className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
              >
                View Resident Directory
              </Link>
              <Link
                href="/messages"
                className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
              >
                Start New Conversation
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity</p>
              <p className="text-sm">Your activity will appear here</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Community Events</h2>
          <div className="text-center py-8 text-gray-500">
            <p>No upcoming events</p>
            <Link href="/resources" className="text-indigo-600 hover:underline">
              View all events
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
