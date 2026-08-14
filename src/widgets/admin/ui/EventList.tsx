'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  MoreVertical,
  Sparkles,
  Trophy,
  Users,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { apiDelete, apiGet } from '@/shared/api/http-client';
import { ApiClientError } from '@/shared/api/http-client';

const log = createComponentLogger('AdminEventsList');

interface AdminEvent {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  location: string;
  organizer: string;
  image: string | null;
  isPublic: boolean;
  isDraft: boolean;
  category: string | null;
  maxAttendees: number | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  attendeeCount: number;
}

interface AdminEventsResponse {
  events: AdminEvent[];
  stats: {
    upcoming: number;
    thisWeek: number;
    totalRsvps: number;
    cancelled: number;
    drafts: number;
  };
}

type EventStatus = 'Draft' | 'Upcoming' | 'Past' | 'Cancelled';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  social: Sparkles,
  meeting: Users,
  sport: Trophy,
  'community project': Sprout,
  other: CalendarDays,
};

const CATEGORY_COLORS: Record<string, string> = {
  social: 'bg-pink-100 text-pink-600',
  meeting: 'bg-blue-100 text-blue-600',
  sport: 'bg-green-100 text-green-600',
  'community project': 'bg-amber-100 text-amber-600',
  other: 'bg-gray-100 text-gray-600',
};

function getCategoryIcon(category: string | null): LucideIcon {
  if (!category) return CalendarDays;
  return CATEGORY_ICONS[category.toLowerCase()] ?? CalendarDays;
}

function getCategoryColor(category: string | null): string {
  if (!category) return 'bg-gray-100 text-gray-600';
  return CATEGORY_COLORS[category.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
}

function deriveStatus(event: AdminEvent): EventStatus {
  if (event.deletedAt) return 'Cancelled';
  if (event.isDraft) return 'Draft';
  if (new Date(event.date).getTime() < Date.now()) return 'Past';
  return 'Upcoming';
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-medium text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function formatEventDate(date: string): string {
  return new Date(date).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function EventRow({
  event,
  onEdit,
  onCancel,
}: {
  event: AdminEvent;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const status = deriveStatus(event);
  const Icon = getCategoryIcon(event.category);
  const iconColor = getCategoryColor(event.category);
  const rowMuted = status !== 'Upcoming';

  const statusClass =
    status === 'Draft'
      ? 'bg-amber-100 text-amber-700'
      : status === 'Upcoming'
        ? 'bg-green-100 text-green-700'
        : status === 'Past'
          ? 'bg-gray-100 text-gray-600'
          : 'bg-red-100 text-red-700';

  return (
    <tr className={`border-b border-gray-100 last:border-0 ${rowMuted ? 'opacity-60' : ''}`}>
      <td className="px-2 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-medium text-gray-900">{event.title}</span>
        </div>
      </td>
      <td className="px-2 py-3 text-gray-500 whitespace-nowrap">{formatEventDate(event.date)}</td>
      <td className="px-2 py-3 text-gray-500">{event.location || '—'}</td>
      <td className="px-2 py-3 text-gray-500">{event.organizer}</td>
      <td className="px-2 py-3 text-gray-500">
        {event.maxAttendees != null
          ? `${event.attendeeCount}/${event.maxAttendees}`
          : event.attendeeCount}
      </td>
      <td className="px-2 py-3">
        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${statusClass}`}>
          {status}
        </span>
      </td>
      <td className="px-2 py-3 text-right">
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
            aria-label="Event actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {open && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  onClick={() => {
                    setOpen(false);
                    onEdit();
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                  onClick={() => {
                    setOpen(false);
                    onCancel();
                  }}
                >
                  Cancel event
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function EventList() {
  const router = useRouter();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [stats, setStats] = useState<AdminEventsResponse['stats'] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'any' | EventStatus>('any');
  const [visibilityFilter, setVisibilityFilter] = useState<'any' | 'public' | 'residents'>('any');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiGet<AdminEventsResponse>('/api/admin/events');
      setEvents(data.events);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      log.error({}, 'Failed to load events', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(event => {
      if (
        q &&
        !event.title.toLowerCase().includes(q) &&
        !event.organizer.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter !== 'any' && deriveStatus(event) !== statusFilter) return false;
      if (visibilityFilter === 'public' && !event.isPublic) return false;
      if (visibilityFilter === 'residents' && event.isPublic) return false;
      return true;
    });
  }, [events, search, statusFilter, visibilityFilter]);

  const cancelEvent = useCallback(
    async (event: AdminEvent) => {
      if (!window.confirm(`Cancel “${event.title}”? This will hide it from residents.`)) return;
      try {
        await apiDelete(`/api/events/${event.id}`);
        toast.success('Event cancelled');
        void load();
      } catch (err) {
        log.error({ id: event.id }, 'Failed to cancel event', err);
        const msg = err instanceof ApiClientError ? err.message : 'Failed to cancel event';
        toast.error(msg);
      }
    },
    [load]
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatTile label="Upcoming" value={stats?.upcoming ?? 0} />
        <StatTile label="This week" value={stats?.thisWeek ?? 0} />
        <StatTile label="Total RSVPs" value={stats?.totalRsvps ?? 0} />
        <StatTile label="Cancelled" value={stats?.cancelled ?? 0} />
        <StatTile label="Drafts" value={stats?.drafts ?? 0} />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events"
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="any">Status: any</option>
          <option value="Draft">Draft</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Past">Past</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select
          value={visibilityFilter}
          onChange={e => setVisibilityFilter(e.target.value as typeof visibilityFilter)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="any">Visibility: any</option>
          <option value="public">Public</option>
          <option value="residents">Residents only</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500 font-medium">
              <th className="px-2 py-2">Event</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Location</th>
              <th className="px-2 py-2">Organizer</th>
              <th className="px-2 py-2">RSVPs</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  {search.trim() || statusFilter !== 'any' || visibilityFilter !== 'any'
                    ? 'No events match your filters.'
                    : 'No events yet. Create your first event to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map(event => (
                <EventRow
                  key={event.id}
                  event={event}
                  onEdit={() => router.push(`/admin/events/${event.id}`)}
                  onCancel={() => void cancelEvent(event)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </ErrorBoundary>
  );
}
