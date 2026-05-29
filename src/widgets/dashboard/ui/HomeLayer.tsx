'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { authClient } from '@shared/api/auth-client';
import { AlertTriangle, Calendar, Bell, Wrench, Activity, Megaphone, Clock } from 'lucide-react';

async function fetchJson<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const body = await res.json();
    return (body?.data ?? body) as T[];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Announcement {
  id: string;
  title: string;
  priority: string;
  createdAt: string;
}

interface MaintenanceItem {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
}

interface EventItem {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  location?: string;
}

interface BookingItem {
  id: string;
  title: string;
  date: string;
  time?: string;
}

interface ActivityItem {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  summary?: string;
}

interface HomeLayerData {
  urgentAnnouncements: Announcement[];
  overdueMaintenance: MaintenanceItem[];
  unreadMessageCount: number;
  todayEvents: EventItem[];
  todayBookings: BookingItem[];
  recentActivity: ActivityItem[];
  communityAnnouncements: Announcement[];
}

// ═══════════════════════════════════════════════════════════════
// URGENCY ZONE
// ═══════════════════════════════════════════════════════════════

function UrgencyZone({
  urgentAnnouncements,
  overdueMaintenance,
  unreadMessageCount,
}: {
  urgentAnnouncements: Announcement[];
  overdueMaintenance: MaintenanceItem[];
  unreadMessageCount: number;
}) {
  const hasUrgentItems =
    urgentAnnouncements.length > 0 || overdueMaintenance.length > 0 || unreadMessageCount > 0;

  if (!hasUrgentItems) return null;

  return (
    <section aria-label="Urgent items" className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-semibold text-gray-900">Needs Attention</h2>
      </div>
      <div className="space-y-2">
        {urgentAnnouncements.map(a => (
          <UrgencyCard
            key={a.id}
            href="/dashboard/community"
            icon={<Megaphone className="w-4 h-4 text-red-500" />}
            label={a.title}
            priority={a.priority}
          />
        ))}
        {overdueMaintenance.length > 0 && (
          <UrgencyCard
            href="/dashboard/services"
            icon={<Wrench className="w-4 h-4 text-amber-500" />}
            label={`${overdueMaintenance.length} overdue maintenance request${overdueMaintenance.length !== 1 ? 's' : ''}`}
            priority="high"
          />
        )}
        {unreadMessageCount > 0 && (
          <UrgencyCard
            href="/dashboard/messages"
            icon={<Bell className="w-4 h-4 text-indigo-500" />}
            label={`${unreadMessageCount} unread message${unreadMessageCount !== 1 ? 's' : ''}`}
            priority="normal"
          />
        )}
      </div>
    </section>
  );
}

function UrgencyCard({
  href,
  icon,
  label,
  priority,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  priority: string;
}) {
  const borderColor =
    priority === 'urgent'
      ? 'border-l-red-500'
      : priority === 'high'
        ? 'border-l-amber-500'
        : 'border-l-indigo-500';

  const pillColor =
    priority === 'urgent'
      ? 'bg-red-100 text-red-700'
      : priority === 'high'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-indigo-100 text-indigo-700';

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border-l-3 ${borderColor} hover:bg-gray-50 transition-colors`}
    >
      {icon}
      <span className="flex-1 text-sm font-medium text-gray-900 truncate">{label}</span>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pillColor}`}>
        {priority}
      </span>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// TODAY ZONE
// ═══════════════════════════════════════════════════════════════

function TodayZone({
  todayEvents,
  todayBookings,
}: {
  todayEvents: EventItem[];
  todayBookings: BookingItem[];
}) {
  const hasItems = todayEvents.length > 0 || todayBookings.length > 0;
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section aria-label="Today" className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">Today</h2>
        <span className="text-sm text-gray-500 ml-auto">{today}</span>
      </div>
      {hasItems ? (
        <div className="space-y-2">
          {todayBookings.map(b => (
            <TodayCard
              key={b.id}
              href="/dashboard/services"
              icon={<Clock className="w-4 h-4 text-blue-500" />}
              title={b.title}
              subtitle={b.time || 'All day'}
              type="Booking"
            />
          ))}
          {todayEvents.map(e => (
            <TodayCard
              key={e.id}
              href="/dashboard/community"
              icon={<Calendar className="w-4 h-4 text-green-500" />}
              title={e.title}
              subtitle={e.location || 'Community event'}
              type="Event"
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-500 text-sm">Nothing scheduled for today</p>
        </div>
      )}
    </section>
  );
}

function TodayCard({
  href,
  icon,
  title,
  subtitle,
  type,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  type: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{type}</span>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTIVITY ZONE
// ═══════════════════════════════════════════════════════════════

function ActivityZone({
  recentActivity,
  communityAnnouncements,
}: {
  recentActivity: ActivityItem[];
  communityAnnouncements: Announcement[];
}) {
  const hasItems = recentActivity.length > 0 || communityAnnouncements.length > 0;

  return (
    <section aria-label="Recent activity" className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
      </div>
      {hasItems ? (
        <div className="space-y-2">
          {communityAnnouncements.map(a => (
            <ActivityCard
              key={a.id}
              href="/dashboard/community"
              icon={<Megaphone className="w-4 h-4 text-purple-500" />}
              title={a.title}
              date={a.createdAt}
              type="Announcement"
            />
          ))}
          {recentActivity.map(a => (
            <ActivityCard
              key={a.id}
              href="/dashboard/community"
              icon={<Activity className="w-4 h-4 text-gray-400" />}
              title={a.title}
              date={a.createdAt}
              type={a.type}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-500 text-sm">No recent activity</p>
        </div>
      )}
    </section>
  );
}

function ActivityCard({
  href,
  icon,
  title,
  date,
  type,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  date: string;
  type: string;
}) {
  const timeAgo = formatTimeAgo(date);

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500">{timeAgo}</p>
      </div>
      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{type}</span>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

function isToday(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

function isTomorrow(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      date.getFullYear() === tomorrow.getFullYear() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getDate() === tomorrow.getDate()
    );
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// SKELETON / ERROR STATES
// ═══════════════════════════════════════════════════════════════

function ZoneSkeleton() {
  return (
    <div className="space-y-2 mb-6">
      <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
      <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
      <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
    </div>
  );
}

function ZoneError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p className="text-sm text-red-700 mb-2">Failed to load home data</p>
      <button onClick={onRetry} className="text-sm text-red-600 underline hover:text-red-800">
        Retry
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function HomeLayer() {
  const [data, setData] = useState<HomeLayerData>({
    urgentAnnouncements: [],
    overdueMaintenance: [],
    unreadMessageCount: 0,
    todayEvents: [],
    todayBookings: [],
    recentActivity: [],
    communityAnnouncements: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { data: session } = authClient.useSession();

  const role = session?.user?.role || 'RESIDENT';
  const userId = session?.user?.id;

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);

    // Single Promise.all for all zone data — avoids sequential render cascade
    Promise.all([
      // Urgent announcements
      fetchJson<Announcement>('/api/announcements?priority=urgent'),

      // Overdue maintenance (resident: own; admin: all)
      fetchJson<MaintenanceItem>(
        userId
          ? `/api/maintenance?overdue=true${role.toUpperCase() === 'RESIDENT' ? `&userId=${userId}` : ''}`
          : '/api/maintenance?overdue=true'
      ),

      // Unread message count (returns object, not array)
      fetch('/api/messages/unread')
        .then(r => (r.ok ? r.json() : { totalUnread: 0 }))
        .then(data => {
          const unwrapped = (data as Record<string, unknown>)?.data ?? data;
          return ((unwrapped as { totalUnread?: number })?.totalUnread ?? 0) as number;
        })
        .catch(() => 0),

      // Upcoming events (filter today/tomorrow client-side)
      fetchJson<EventItem>('/api/events?upcoming=true&limit=5'),

      // Bookings today
      fetchJson<BookingItem>('/api/bookings?date=today'),

      // Recent activity
      fetchJson<Announcement>('/api/announcements?limit=5'),

      // Community announcements (non-urgent)
      fetchJson<Announcement>('/api/announcements?limit=5&priority=normal'),
    ])
      .then(
        ([
          urgentAnnouncements,
          overdueMaintenance,
          unreadMessageCount,
          upcomingEvents,
          todayBookings,
          recentAnnouncements,
          communityAnnouncements,
        ]) => {
          // Filter events to today/tomorrow
          const todayEvents = (upcomingEvents as EventItem[]).filter(
            e => isToday(e.startDate) || isTomorrow(e.startDate)
          );

          // Use recentAnnouncements as recent activity if no dedicated activity API
          const recentActivity = (recentAnnouncements as Announcement[])
            .filter(a => a.priority !== 'urgent')
            .map(a => ({
              id: a.id,
              title: a.title,
              type: 'Announcement',
              createdAt: a.createdAt,
            }));

          setData({
            urgentAnnouncements: urgentAnnouncements as Announcement[],
            overdueMaintenance: overdueMaintenance as MaintenanceItem[],
            unreadMessageCount: unreadMessageCount as number,
            todayEvents,
            todayBookings: todayBookings as BookingItem[],
            recentActivity,
            communityAnnouncements: communityAnnouncements as Announcement[],
          });
          setLoading(false);
        }
      )
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [userId, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return <ZoneError onRetry={fetchData} />;
  }

  if (loading) {
    return (
      <div>
        <ZoneSkeleton />
        <ZoneSkeleton />
        <ZoneSkeleton />
      </div>
    );
  }

  return (
    <div>
      <UrgencyZone
        urgentAnnouncements={data.urgentAnnouncements}
        overdueMaintenance={data.overdueMaintenance}
        unreadMessageCount={data.unreadMessageCount}
      />
      <TodayZone todayEvents={data.todayEvents} todayBookings={data.todayBookings} />
      <ActivityZone
        recentActivity={data.recentActivity}
        communityAnnouncements={data.communityAnnouncements}
      />
    </div>
  );
}

export default HomeLayer;
