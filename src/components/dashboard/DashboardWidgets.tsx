'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Bookshelf } from '@/components/ui/Bookshelf';
import { MediaLibrary } from '@/components/ui/MediaLibrary';

export function QuickActionsWidget() {
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();

  return (
    <ErrorBoundary>
      <div className="space-y-3">
        <Link
          href="/maintenance"
          className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
        >
          {t('submitRequest', 'Submit Maintenance Request')}
        </Link>
        <Link
          href="/bookings"
          className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
        >
          {t('bookFacility', 'Book a Facility')}
        </Link>
        <Link
          href="/admin/content/new"
          className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
        >
          {t('createContent', 'Create Content')}
        </Link>
        {session?.user?.id && (
          <Link
            href={`/resident/${session.user.id}`}
            className="block p-3 bg-slate-50 rounded hover:bg-gray-200 transition"
          >
            {t('viewProfile', 'View My Profile')}
          </Link>
        )}
      </div>
    </ErrorBoundary>
  );
}

export function RecentActivityWidget() {
  const { t } = useTranslation('dashboard');

  return (
    <ErrorBoundary>
      <div className="text-center py-8 text-gray-500">
        <p>{t('noActivity', 'No recent activity')}</p>
        <p className="text-sm">{t('activityWillAppear', 'Recent activity will appear here')}</p>
      </div>
    </ErrorBoundary>
  );
}

export function NotificationsWidget() {
  return (
    <ErrorBoundary>
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">No new notifications</p>
      </div>
    </ErrorBoundary>
  );
}

export function EventsWidget() {
  const { t } = useTranslation('dashboard');

  return (
    <ErrorBoundary>
      <div className="text-center py-8 text-gray-500">
        <p>{t('noEvents', 'No upcoming events')}</p>
        <Link href="/resources" className="text-indigo-600 hover:underline">
          {t('viewAllEvents', 'View all events')}
        </Link>
      </div>
    </ErrorBoundary>
  );
}

export function BookshelfWidget() {
  const { data: session } = authClient.useSession();

  if (!session?.user?.id) {
    return (
      <ErrorBoundary>
        <div className="text-center py-4 text-gray-500">
          <p>Please log in to view your bookshelf</p>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Bookshelf userId={session.user.id} editable={true} />
    </ErrorBoundary>
  );
}

export function MediaWidget() {
  return (
    <ErrorBoundary>
      <MediaLibrary />
    </ErrorBoundary>
  );
}

// This will be implemented separately
export function MyContentWidget() {
  return (
    <ErrorBoundary>
      <div className="text-center py-4 text-gray-500">
        <p>My content widget - coming soon</p>
      </div>
    </ErrorBoundary>
  );
}
