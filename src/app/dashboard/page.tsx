'use client';

import { useUser } from '@stackframe/stack';
import Link from 'next/link';

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
          <p className="text-2xl font-bold text-soralia-dark">{value}</p>
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

export default function DashboardPage() {
  const user = useUser({ or: 'return-null' });

  return (
    <main className="min-h-screen bg-soralia-light">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-soralia-primary mb-2">
            Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
          </h1>
          <p className="text-gray-600">Here's what's happening in your community.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="My Requests" value={0} icon="🔧" href="/maintenance" />
          <StatCard title="My Bookings" value={0} icon="📅" href="/bookings" />
          <StatCard title="Messages" value={0} icon="💬" href="/messages" />
          <StatCard title="Notifications" value={0} icon="🔔" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/maintenance/new"
                className="block p-3 bg-soralia-light rounded hover:bg-gray-200 transition"
              >
                Submit Maintenance Request
              </Link>
              <Link
                href="/bookings/new"
                className="block p-3 bg-soralia-light rounded hover:bg-gray-200 transition"
              >
                Book Community Facility
              </Link>
              <Link
                href="/directory"
                className="block p-3 bg-soralia-light rounded hover:bg-gray-200 transition"
              >
                View Resident Directory
              </Link>
              <Link
                href="/messages"
                className="block p-3 bg-soralia-light rounded hover:bg-gray-200 transition"
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
            <Link href="/events" className="text-soralia-primary hover:underline">
              View all events
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
