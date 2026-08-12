'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { useSafeTranslation } from '@shared/lib';
import { useAdminStats } from '@features/admin';
import { PageSettingsWidget } from '@widgets/admin';
import { apiGet, ApiClientError } from '@/shared/api/http-client';

interface HealthStatus {
  db: 'connected' | 'error';
  dbError?: string;
  tenantId: string;
  tenantName: string;
  totalUsers: number;
  activeUsers: number;
}

interface ActivityItem {
  id: string;
  domain: string;
  action: string;
  resourceLabel: string | null;
  actorName: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

const DOMAIN_COLORS: Record<string, string> = {
  maintenance: 'bg-red-100 text-red-600',
  users: 'bg-indigo-100 text-indigo-600',
  content: 'bg-emerald-100 text-emerald-600',
  events: 'bg-purple-100 text-purple-600',
  surveys: 'bg-blue-100 text-blue-600',
};

const ACTION_LABELS: Record<string, string> = {
  submitted: 'submitted',
  started: 'started work on',
  completed: 'completed',
  cancelled: 'cancelled',
  joined: 'joined',
  published: 'published',
  drafted: 'saved a draft of',
  activated: 'activated',
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function HealthCard({ health }: { health: HealthStatus | null }) {
  const statusColor =
    health?.db === 'connected' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">System Health</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {health?.db === 'connected' ? 'Healthy' : 'Error'}
        </span>
      </div>
      {health && (
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">Tenant:</span> {health.tenantName}
          </p>
          <p>
            <span className="font-medium">Database:</span>{' '}
            {health.db === 'connected' ? 'Connected' : health.dbError || 'Disconnected'}
          </p>
          <p>
            <span className="font-medium">Online:</span> {health.activeUsers} active
          </p>
        </div>
      )}
      {!health && (
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      )}
    </div>
  );
}

export default function AdminSystemPage() {
  const { tx } = useSafeTranslation(['common', 'admin']);
  const { data: stats, isLoading: statsLoading } = useAdminStats();

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [, setHealthLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const { data } = await apiGet<HealthStatus>('/api/admin/system/health');
      setHealth(data);
    } catch (err) {
      const status = err instanceof ApiClientError ? err.statusCode : 'Network error';
      setHealth({
        db: 'error',
        dbError: `HTTP ${status}`,
        tenantId: '',
        tenantName: 'Unknown',
        totalUsers: 0,
        activeUsers: 0,
      });
    }
    setHealthLoading(false);
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const { data } = await apiGet<{ items?: ActivityItem[] } | ActivityItem[]>(
        '/api/admin/activity?limit=8'
      );
      const unwrapped = Array.isArray(data) ? data : (data?.items ?? []);
      setActivities(unwrapped);
    } catch {
      /* silent — activity is non-critical */
    }
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchActivity();
  }, [fetchHealth, fetchActivity]);

  const s = stats ?? { totalUsers: 0, activeRequests: 0, totalGroups: 0, totalContent: 0 };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { label: tx('nav.home', 'Home'), href: '/' },
              { label: tx('nav.admin', 'Admin'), href: '/admin' },
              { label: 'System' },
            ]}
          />

          <div className="flex items-center gap-3 mt-6 mb-8">
            <DomainIconBadge id="system" variant="admin" size="lg" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System</h1>
              <p className="text-sm text-gray-500">Platform configuration and health</p>
            </div>
          </div>

          {/* Section: Stats Overview */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/admin/users"
                className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <DomainIconBadge id="users" variant="admin" size="xl" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">Users</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? '...' : s.totalUsers}
                    </p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/requests"
                className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <DomainIconBadge id="maintenance" variant="admin" size="xl" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">Requests</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? '...' : s.activeRequests}
                    </p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/groups"
                className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <DomainIconBadge id="groups" variant="admin" size="xl" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">Groups</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? '...' : s.totalGroups}
                    </p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/content"
                className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <DomainIconBadge id="content" variant="admin" size="xl" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">Content</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? '...' : s.totalContent}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* Section: Health + Activity */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <HealthCard health={health} />
              </div>
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Recent Activity</h3>
                  {activityLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="animate-pulse h-8 bg-gray-100 rounded" />
                      ))}
                    </div>
                  ) : activities.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No recent activity</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.slice(0, 6).map(item => (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0 text-sm"
                        >
                          <span
                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              DOMAIN_COLORS[item.domain] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.domain[0]?.toUpperCase() ?? '?'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-900 truncate">
                              <span className="font-medium">{item.actorName ?? 'System'}</span>{' '}
                              {ACTION_LABELS[item.action] ?? item.action}{' '}
                              {item.resourceLabel && (
                                <span className="font-medium">{item.resourceLabel}</span>
                              )}
                            </p>
                          </div>
                          <time className="flex-shrink-0 text-xs text-gray-400">
                            {formatTimeAgo(item.createdAt)}
                          </time>
                        </div>
                      ))}
                    </div>
                  )}
                  {activities.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        Showing most recent activity across all domains
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section: Page Settings (Feature Flags) */}
          <section className="mb-8">
            <PageSettingsWidget />
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
}
