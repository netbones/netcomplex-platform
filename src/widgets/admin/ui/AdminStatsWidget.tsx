'use client';

import Link from 'next/link';
import { ErrorBoundary } from '@shared/ui';
import { useAdminStats } from '@features/admin';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  href?: string;
  color?: string;
  loading?: boolean;
}

const STAT_COLORS: Record<string, string> = {
  users: 'bg-blue-500',
  requests: 'bg-orange-500',
  groups: 'bg-green-500',
  content: 'bg-purple-500',
};

function StatCard({ title, value, icon, href, color = 'bg-gray-500', loading }: StatCardProps) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 group">
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}
        >
          <i className={`fas ${icon} text-xl text-white`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{loading ? '...' : value}</p>
        </div>
        {href && (
          <i className="fas fa-chevron-right text-gray-300 group-hover:text-indigo-500 transition-colors"></i>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function AdminStatsWidget() {
  const { data: stats, isLoading } = useAdminStats();

  const s = stats ?? { totalUsers: 0, activeRequests: 0, totalGroups: 0, totalContent: 0 };

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={s.totalUsers}
          icon="fa-users"
          color={STAT_COLORS.users}
          href="/admin/users"
          loading={isLoading}
        />
        <StatCard
          title="Active Requests"
          value={s.activeRequests}
          icon="fa-tools"
          color={STAT_COLORS.requests}
          href="/admin/requests"
          loading={isLoading}
        />
        <StatCard
          title="Interest Groups"
          value={s.totalGroups}
          icon="fa-people-roof"
          color={STAT_COLORS.groups}
          href="/admin/groups"
          loading={isLoading}
        />
        <StatCard
          title="Content Items"
          value={s.totalContent}
          icon="fa-file-alt"
          color={STAT_COLORS.content}
          href="/admin/content"
          loading={isLoading}
        />
      </div>
    </ErrorBoundary>
  );
}
