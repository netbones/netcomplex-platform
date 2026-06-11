'use client';

import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { WidgetRenderer } from '@widgets/dashboard';
import { ErrorBoundary, Breadcrumbs } from '@shared/ui';
import { authClient } from '@api/client';

/**
 * Announcements management page within the Messages space.
 *
 * Renders the AdminAnnouncementsWidget as the full management view.
 * This is the canonical location for announcements management per Q4 decision.
 * Role-gated: only admin/board can access.
 *
 * Old /admin/announcements route is preserved for backward compat.
 */
export default function MessagesAnnouncementsPage() {
  const { data: session } = authClient.useSession();
  const role = session?.user?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'BOARD' || role === 'MANAGER';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">
            You need admin or board permissions to manage announcements.
          </p>
          <Link
            href="/dashboard/messages"
            className="mt-4 inline-block px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
          >
            &larr; Back to Messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Messages', href: '/dashboard/messages' },
            { label: 'Announcements', href: '/dashboard/messages/announcements' },
          ]}
        />

        <div className="flex items-center justify-between mt-6 mb-6">
          <div className="flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
              <p className="text-sm text-gray-500">Manage community announcements</p>
            </div>
          </div>
          <Link
            href="/dashboard/messages"
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
          >
            &larr; Back to Messages
          </Link>
        </div>

        <ErrorBoundary>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <WidgetRenderer widgetId="admin-announcements" />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
