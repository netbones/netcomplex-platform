'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Breadcrumbs, ErrorBoundary, LoadingSpinner } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { apiGet } from '@/shared/api/http-client';

const log = createComponentLogger('admin-requests-analytics-page');

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
  byCategory: { category: string; count: number }[];
  trend: { month: string; count: number }[];
}

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-yellow-500',
  ASSIGNED: 'bg-purple-500',
  IN_PROGRESS: 'bg-blue-500',
  PENDING_PARTS: 'bg-orange-500',
  SCHEDULED: 'bg-indigo-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-gray-500',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-green-500',
  MEDIUM: 'bg-yellow-500',
  HIGH: 'bg-orange-500',
  EMERGENCY: 'bg-red-500',
};

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase">{title}</h3>
      <p className={`text-3xl font-bold mt-2 ${color || 'text-gray-900'}`}>{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function BarChart({
  data,
  title,
  colorKey,
}: {
  data: { [key: string]: number };
  title: string;
  colorKey: Record<string, string>;
}) {
  const max = Math.max(...Object.values(data), 1);
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">{title}</h3>
      <div className="space-y-3">
        {entries.map(([key, count]) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">{key}</span>
              <span className="text-gray-500">{count}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${colorKey[key] || 'bg-indigo-500'}`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MaintenanceAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data } = await apiGet<Stats>('/api/admin/maintenance-stats');
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
      <ErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Maintenance Requests', href: '/admin/requests' },
              { label: 'Analytics' },
            ]}
          />
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!stats) {
    return (
      <ErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Maintenance Requests', href: '/admin/requests' },
              { label: 'Analytics' },
            ]}
          />
          <div className="text-center py-12 text-gray-500">Failed to load statistics</div>
        </div>
      </ErrorBoundary>
    );
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

  const categoryData = stats.byCategory.reduce(
    (acc, { category, count }) => {
      acc[category] = count;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Maintenance Requests', href: '/admin/requests' },
            { label: 'Analytics' },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Image src="/platform/maintenance.svg" alt="" width={40} height={40} />
            Maintenance Analytics
          </h1>
          <p className="text-gray-600 mt-1">Overview of maintenance request metrics</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            title="Open Requests"
            value={stats.overview.totalOpen}
            color="text-indigo-600"
          />
          <StatCard title="Submitted (This Month)" value={stats.overview.submittedThisMonth} />
          <StatCard
            title="Completed (This Month)"
            value={stats.overview.completedThisMonth}
            color="text-green-600"
          />
          <StatCard title="Overdue" value={stats.overview.overdue} color="text-red-600" />
          <StatCard
            title="Avg. Resolution (Days)"
            value={stats.overview.avgResolutionDays}
            subtitle="for completed requests"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BarChart data={statusData} title="By Status" colorKey={statusColors} />
          <BarChart data={priorityData} title="By Priority" colorKey={priorityColors} />
          <BarChart data={categoryData} title="By Category" colorKey={{}} />
        </div>

        {/* Trend Table */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Monthly Trend</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Month</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    Requests
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.trend.map(row => (
                  <tr key={row.month} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-900">{row.month}</td>
                    <td className="py-3 px-4 text-gray-600 text-right">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
