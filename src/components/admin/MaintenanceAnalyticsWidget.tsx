'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/Loading';
import { createComponentLogger } from '@/lib/logging';

const log = createComponentLogger('MaintenanceAnalyticsWidget');

interface Stats {
  overview: {
    totalOpen: number;
    submittedThisMonth: number;
    completedThisMonth: number;
    overdue: number;
    avgResolutionDays: number;
  };
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

export function MaintenanceAnalyticsWidget() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/maintenance-stats');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        log.error({}, 'Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-500 text-center py-4">Failed to load stats</p>;
  }

  const statusData = stats.byStatus.reduce(
    (acc, { status, count }) => {
      acc[status] = count;
      return acc;
    },
    {} as Record<string, number>
  );

  const priorityData = stats.byPriority.reduce(
    (acc, { priority, count }) => {
      acc[priority] = count;
      return acc;
    },
    {} as Record<string, number>
  );

  const maxStatus = Math.max(...Object.values(statusData), 1);
  const maxPriority = Math.max(...Object.values(priorityData), 1);

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-indigo-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{stats.overview.totalOpen}</p>
            <p className="text-xs text-gray-600">Open</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.overview.completedThisMonth}</p>
            <p className="text-xs text-gray-600">This Month</p>
          </div>
        </div>

        {/* By Status */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">By Status</p>
          <div className="space-y-1">
            {Object.entries(statusData).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-24 truncate">
                  {status.replace('_', ' ')}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${(count / maxStatus) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Priority */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">By Priority</p>
          <div className="space-y-1">
            {Object.entries(priorityData).map(([priority, count]) => {
              const colors: Record<string, string> = {
                LOW: 'bg-green-500',
                MEDIUM: 'bg-yellow-500',
                HIGH: 'bg-orange-500',
                EMERGENCY: 'bg-red-500',
              };
              return (
                <div key={priority} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-20 truncate">{priority}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[priority] || 'bg-indigo-500'}`}
                      style={{ width: `${(count / maxPriority) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {stats.overview.overdue > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
            <span className="text-red-600 font-medium">{stats.overview.overdue} overdue</span>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
