'use client';

import Link from 'next/link';
import { ErrorBoundary } from '@shared/ui';
import { useActiveAnnouncements } from '@shared/lib/hooks';
import { PRIORITY_TAXONOMY, type AnnouncementPriority } from '@features/announcements';

interface StreamAnnouncement {
  id: string;
  title: string;
  content: string;
  author: string;
  priority: AnnouncementPriority;
  targetFilter: string;
  targetRoles: string[];
  resourceId: string | null;
  createdAt: string;
  expiresAt: string | null;
  resource?: {
    id: string;
    title: string;
    fileUrl: string | null;
    externalUrl: string | null;
  };
}

export function AnnouncementsStreamWidget() {
  const { data: rawData, isLoading, error, refetch } = useActiveAnnouncements();

  const announcements: StreamAnnouncement[] = rawData
    ? Array.isArray(rawData.success !== undefined ? rawData.data : rawData)
      ? rawData.success !== undefined
        ? rawData.data
        : rawData
      : []
    : [];

  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="text-center py-4">
          <i className="fas fa-exclamation-circle text-2xl text-red-500 mb-2"></i>
          <p className="text-sm text-gray-600 mb-3">Failed to load announcements</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </ErrorBoundary>
    );
  }

  if (announcements.length === 0) {
    return (
      <ErrorBoundary>
        <div className="text-center py-6">
          <i className="fas fa-bullhorn text-3xl text-gray-400 mb-3"></i>
          <p className="text-sm text-gray-600">No active announcements</p>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-3">
        {announcements.map(announcement => {
          const tax = PRIORITY_TAXONOMY[announcement.priority] || PRIORITY_TAXONOMY.normal;

          return (
            <div
              key={announcement.id}
              id={`announcement-${announcement.id}`}
              className={`${tax.borderColor} pl-4 py-2`}
            >
              {/* Header: Priority badge + Title + Date */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${tax.color}`}
                >
                  {tax.label}
                </span>
                <h3 className="text-sm font-semibold text-gray-900 flex-1">{announcement.title}</h3>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {new Date(announcement.createdAt).toLocaleDateString('en-ZA', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* Content — full, not truncated per revised instructions */}
              <p className="text-sm text-gray-700 mb-1">
                {typeof announcement.content === 'string'
                  ? announcement.content
                  : (announcement.content as Record<string, string>)?.en || ''}
              </p>

              {/* Footer: Author · Expiry · Document link */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>&mdash; {announcement.author}</span>
                {announcement.expiresAt && (
                  <span className="text-amber-600">
                    Expires{' '}
                    {new Date(announcement.expiresAt).toLocaleDateString('en-ZA', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {announcement.resourceId && (
                  <Link
                    href={`/resources/${announcement.resourceId}`}
                    className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    <i className="fas fa-paperclip text-xs"></i>
                    View Document
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ErrorBoundary>
  );
}
