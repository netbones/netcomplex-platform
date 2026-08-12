'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { authClient, trpc } from '@api/client';
import {
  AlertTriangle,
  Calendar,
  Bell,
  Wrench,
  Activity,
  Megaphone,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { getLocalizedValue } from '@shared/lib/i18n/config';
import { useLanguage } from '@shared/lib/hooks/useSafeTranslation';
import { useTenant } from '@entities/tenant';
import { SetupProgressCard } from '@/features/setup';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

const BADGE_STYLES: Record<string, string> = {
  Announcement: 'text-purple-700 bg-purple-100',
  Maintenance: 'text-amber-700 bg-amber-100',
  Event: 'text-green-700 bg-green-100',
  Booking: 'text-blue-700 bg-blue-100',
  Message: 'text-indigo-700 bg-indigo-100',
  News: 'text-sky-700 bg-sky-100',
  Blog: 'text-teal-700 bg-teal-100',
};

const ROW_TINT: Record<string, string> = {
  Announcement: 'bg-purple-50',
  Maintenance: 'bg-amber-50',
  Event: 'bg-green-50',
  Booking: 'bg-blue-50',
  Message: 'bg-indigo-50',
  News: 'bg-sky-50',
  Blog: 'bg-teal-50',
};

interface Announcement {
  id: string;
  title: string | Record<string, unknown>;
  priority: string;
  createdAt: string;
  content?: string;
}

function resolveTitle(title: Announcement['title'], locale: string): string {
  if (typeof title === 'string') return title;
  return getLocalizedValue(title, locale) || '';
}

interface MaintenanceItem {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
}

/** Maintenance request shape returned by /api/maintenance for activity zone */
interface MaintenanceActivityRow {
  id: string;
  ticketNumber?: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
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
  content?: string;
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
  language,
}: {
  urgentAnnouncements: Announcement[];
  overdueMaintenance: MaintenanceItem[];
  unreadMessageCount: number;
  language: string;
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
            href={`/news#announcement-${a.id}`}
            icon={<Megaphone className="w-4 h-4 text-red-500" />}
            label={resolveTitle(a.title, language)}
            priority={a.priority}
          />
        ))}
        {overdueMaintenance.length > 0 && (
          <UrgencyCard
            href="/dashboard/services/maintenance"
            icon={<Wrench className="w-4 h-4 text-amber-500" />}
            label={`${overdueMaintenance.length} overdue maintenance request${overdueMaintenance.length !== 1 ? 's' : ''}`}
            priority="high"
          />
        )}
        {unreadMessageCount > 0 && (
          <UrgencyCard
            href="/dashboard/communication"
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
  const urgencyTint: Record<string, string> = {
    urgent: 'bg-red-50',
    high: 'bg-amber-50',
    normal: 'bg-indigo-50',
  };

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
      className={`flex items-center gap-3 p-3 rounded-lg shadow-sm border-l-3 ${borderColor} ${urgencyTint[priority] ?? 'bg-white'} hover:brightness-95 transition`}
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
              href={`/dashboard/services/amenities?id=${b.id}`}
              icon={<Clock className="w-4 h-4 text-blue-500" />}
              title={b.title}
              subtitle={b.time || 'All day'}
              type="Booking"
            />
          ))}
          {todayEvents.map(e => (
            <TodayCard
              key={e.id}
              href={`/dashboard/services/events/${e.id}`}
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
      className={`flex items-center gap-3 p-3 rounded-lg shadow-sm hover:brightness-95 transition ${ROW_TINT[type] ?? 'bg-white'}`}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${BADGE_STYLES[type] ?? 'text-gray-400 bg-gray-100'}`}
      >
        {type}
      </span>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTIVITY ZONE
// ═══════════════════════════════════════════════════════════════

function ActivityZone({
  recentActivity,
  communityAnnouncements,
  language,
}: {
  recentActivity: ActivityItem[];
  communityAnnouncements: Announcement[];
  language: string;
}) {
  const hasItems = recentActivity.length > 0 || communityAnnouncements.length > 0;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
              id={a.id}
              icon={<Megaphone className="w-4 h-4 text-purple-500" />}
              title={resolveTitle(a.title, language)}
              date={a.createdAt}
              type="Announcement"
              content={a.content}
              expanded={expandedIds.has(a.id)}
              onToggle={() => toggleExpand(a.id)}
            />
          ))}
          {recentActivity.map(a => (
            <ActivityCard
              key={a.id}
              id={a.id}
              icon={
                a.type === 'Maintenance' ? (
                  <Wrench className="w-4 h-4 text-indigo-500" />
                ) : (
                  <Activity className="w-4 h-4 text-gray-400" />
                )
              }
              title={a.title}
              date={a.createdAt}
              type={a.type}
              content={a.content}
              expanded={expandedIds.has(a.id)}
              onToggle={() => toggleExpand(a.id)}
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

const ACTIVITY_ROUTES: Record<string, string> = {
  Maintenance: '/dashboard/services/maintenance?id=',
  News: '/news/',
  Blog: '/news/',
};

function getActivityHref(id: string, type: string): string | null {
  const base = ACTIVITY_ROUTES[type];
  if (!base) {
    return type === 'Announcement' ? null : '/dashboard/community';
  }
  return `${base}${id}`;
}

function ActivityCard({
  id,
  icon,
  title,
  date,
  type,
  content,
  expanded,
  onToggle,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  date: string;
  type: string;
  content?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const timeAgo = formatTimeAgo(date);
  const href = getActivityHref(id, type);
  const isExpandable = type === 'Announcement' && content;

  const contentPreview = content
    ? content.length > 200
      ? content.slice(0, 200) + '…'
      : content
    : null;

  const rowClass = `flex items-start gap-3 p-3 rounded-lg shadow-sm transition cursor-pointer ${
    ROW_TINT[type] ?? 'bg-white'
  } hover:brightness-95`;

  const inner = (
    <>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500">{timeAgo}</p>
        {expanded && contentPreview && (
          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{contentPreview}</p>
        )}
      </div>
      <span
        className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
          BADGE_STYLES[type] ?? 'text-gray-400 bg-gray-100'
        }`}
      >
        {type}
      </span>
      {isExpandable && (
        <ChevronRight
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {inner}
      </Link>
    );
  }

  // Non-navigable cards (announcements) — expand on click
  return (
    <div
      role="button"
      tabIndex={0}
      className={rowClass}
      onClick={onToggle}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
    >
      {inner}
    </div>
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
  const { language } = useLanguage();
  const tenant = useTenant();
  const utils = trpc.useUtils();

  const role = session?.user?.role || 'RESIDENT';
  const userId = session?.user?.id;

  // Prevent duplicate fetch waves when Better Auth fires multiple session renders
  // during hydration (undefined → session object → stable). Without this guard,
  // each userId/role change recreates fetchData and re-fires the 8-request wave.
  const fetchedForUser = useRef<string | null>(null);

  const fetchData = useCallback(
    (manual = false) => {
      // Skip if we already fetched for this user, unless manually retried
      if (!manual && fetchedForUser.current === (userId ?? 'anon')) return;
      fetchedForUser.current = userId ?? 'anon';

      setLoading(true);
      setError(false);

      // Single Promise.all for all zone data — avoids sequential render cascade
      Promise.all([
        utils.client.content.listAnnouncements
          .query({ priority: 'urgent' })
          .then(r => r.data ?? [])
          .catch(() => []),
        utils.client.maintenance.listRequests
          .query({ scope: 'mine' })
          .then(r => r.data ?? [])
          .catch(() => []),
        utils.client.chat.getUnreadCounts
          .query()
          .then(d => d.totalUnread)
          .catch(() => 0),
        utils.client.events.listEvents
          .query({ upcoming: true, limit: 5 })
          .then(r => r.data ?? [])
          .catch(() => []),
        utils.client.bookings.listBookings
          .query({ date: 'today' })
          .then(r => r.data ?? [])
          .catch(() => []),
        utils.client.content.listAnnouncements
          .query({ limit: 5 })
          .then(r => r.data ?? [])
          .catch(() => []),
        utils.client.content.listAnnouncements
          .query({ limit: 5, priority: 'normal' })
          .then(r => r.data ?? [])
          .catch(() => []),
        utils.client.maintenance.listRequests
          .query({ scope: 'mine' })
          .then(r => r.data ?? [])
          .catch(() => []),
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
            maintenanceRows,
          ]) => {
            // Filter events to today/tomorrow
            const todayEvents = (upcomingEvents as Array<Record<string, unknown>>).filter(
              e => isToday(e.date as string) || isTomorrow(e.date as string)
            ) as unknown as EventItem[];

            // Transform maintenance items into activity items
            const maintenanceActivity = (maintenanceRows as MaintenanceActivityRow[]).map(m => ({
              id: m.id,
              title: `${m.ticketNumber || 'Request'} — ${m.status.replace('_', ' ')}`,
              type: 'Maintenance',
              createdAt: m.updatedAt || m.createdAt,
              summary: m.category,
            }));

            // Merge announcements + maintenance, sort by date, take top 5
            const announcementActivity = (recentAnnouncements as Announcement[])
              .filter(a => a.priority !== 'urgent')
              .map(a => ({
                id: a.id,
                title: resolveTitle(a.title, language),
                type: 'Announcement' as const,
                createdAt: a.createdAt,
                summary: undefined,
                content: a.content,
              }));

            const recentActivity = [...announcementActivity, ...maintenanceActivity]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5);

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
    },
    [userId, language]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return <ZoneError onRetry={() => fetchData(true)} />;
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
      {tenant?.id && (role === 'ADMIN' || role === 'BOARD') && (
        <SetupProgressCard tenantId={tenant.id} />
      )}
      <UrgencyZone
        urgentAnnouncements={data.urgentAnnouncements}
        overdueMaintenance={data.overdueMaintenance}
        unreadMessageCount={data.unreadMessageCount}
        language={language}
      />
      <TodayZone todayEvents={data.todayEvents} todayBookings={data.todayBookings} />
      <ActivityZone
        recentActivity={data.recentActivity}
        communityAnnouncements={data.communityAnnouncements}
        language={language}
      />
    </div>
  );
}

export default HomeLayer;
