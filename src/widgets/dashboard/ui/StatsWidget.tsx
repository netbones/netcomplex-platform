import Link from 'next/link';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Bell, CalendarCheck, ChevronRight, MessageCircle, Wrench } from 'lucide-react';

const ICON_MAP: Record<string, ReactNode> = {
  'fa-wrench': <Wrench className="text-lg" />,
  'fa-calendar-check': <CalendarCheck className="text-lg" />,
  'fa-comments': <MessageCircle className="text-lg" />,
  'fa-bell': <Bell className="text-lg" />,
};

interface StatsData {
  requests: number;
  bookings: number;
  messages: number;
  notifications: number;
}

interface StatsWidgetProps {
  stats: StatsData;
  loading?: boolean;
}

const STAT_COLORS: Record<string, string> = {
  requests: 'bg-orange-100 text-orange-600',
  bookings: 'bg-blue-100 text-blue-600',
  messages: 'bg-purple-100 text-purple-600',
  notifications: 'bg-yellow-100 text-yellow-600',
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  href?: string;
  color?: string;
}

export function StatCard({
  title,
  value,
  icon,
  href,
  color = 'bg-gray-100 text-gray-600',
}: StatCardProps) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 group">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}
        >
          {ICON_MAP[icon]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {href && (
          <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function StatsWidget({ stats, loading = false }: StatsWidgetProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <StatCard
        title={t('myRequests')}
        value={loading ? '...' : stats.requests}
        icon="fa-wrench"
        color={STAT_COLORS.requests}
        href="/maintenance"
      />
      <StatCard
        title={t('myBookings')}
        value={loading ? '...' : stats.bookings}
        icon="fa-calendar-check"
        color={STAT_COLORS.bookings}
        href="/bookings"
      />
      <StatCard
        title={t('messages')}
        value={loading ? '...' : stats.messages}
        icon="fa-comments"
        color={STAT_COLORS.messages}
        href="/messages"
      />
      <StatCard
        title={t('notifications')}
        value={loading ? '...' : stats.notifications}
        icon="fa-bell"
        color={STAT_COLORS.notifications}
      />
    </div>
  );
}
