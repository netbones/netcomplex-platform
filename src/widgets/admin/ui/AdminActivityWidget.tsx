'use client';

import { useState } from 'react';
import { ErrorBoundary } from '@shared/ui';
import { useAdminActivity } from '@features/admin';
import type { ActivityDomain } from '@features/admin';
import {
  UserPlus,
  Wrench,
  FileText,
  ClipboardList,
  Calendar,
  Inbox,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

const DOMAIN_META: Record<ActivityDomain, { icon: typeof UserPlus; color: string; bg: string }> = {
  users: {
    icon: UserPlus,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  maintenance: {
    icon: Wrench,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  content: {
    icon: FileText,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  surveys: {
    icon: ClipboardList,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  events: {
    icon: Calendar,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
};

const DOMAIN_FILTERS: Array<{ value: ActivityDomain | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'users', label: 'Users' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'content', label: 'Content' },
  { value: 'surveys', label: 'Surveys' },
  { value: 'events', label: 'Events' },
];

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AdminActivityWidget() {
  const [domain, setDomain] = useState<ActivityDomain | 'all'>('all');

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminActivity({ domain, limit: 15 });

  const activities = data?.pages.flatMap(p => p.items) ?? [];

  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0"></div>
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Activity
          </h3>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            title="Refresh activity"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching && !isFetchingNextPage ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Domain filters */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {DOMAIN_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setDomain(f.value)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                domain === f.value
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">Failed to load activity feed.</p>
          </div>
        )}

        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map(activity => {
              const meta = DOMAIN_META[activity.domain] ?? DOMAIN_META.users;
              const Icon = meta.icon;

              return (
                <div
                  key={`${activity.domain}-${activity.id}`}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      <span className="font-medium capitalize">{activity.action}</span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">
                        {activity.resourceLabel ?? activity.domain}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                      {activity.actorName && (
                        <>
                          <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {activity.actorName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasNextPage && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {isFetchingNextPage ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
