'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Plus,
  Pencil,
  Trash2,
  Check,
  Loader2,
  Sparkles,
  Trophy,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, apiPatch } from '@/shared/api/http-client';
import { authClient } from '@/shared/api/auth-client';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('ResidentEventsList');

interface ResidentEvent {
  id: string;
  title: string;
  description: string;
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
  registered: boolean;
  attendeeCount: number;
}

type FilterKey = 'upcoming' | 'attending' | 'mine' | 'past';

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

function formatEventDate(date: string, endDate: string | null): string {
  const start = new Date(date);
  const startStr = start.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const startTime = start.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!endDate) return `${startStr}, ${startTime}`;

  const end = new Date(endDate);
  const endTime = end.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${startStr}, ${startTime} – ${endTime}`;
}

async function fetchEvents(): Promise<ResidentEvent[]> {
  const { data } = await apiGet<ResidentEvent[]>('/api/events');
  return data ?? [];
}

function EventCard({ event, currentUserId }: { event: ResidentEvent; currentUserId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOwn = event.createdByUserId != null && event.createdByUserId === currentUserId;
  const isPast = new Date(event.date).getTime() < Date.now();
  const isFull =
    event.maxAttendees != null && event.attendeeCount >= event.maxAttendees && !event.registered;
  const Icon = getCategoryIcon(event.category);
  const iconColor = getCategoryColor(event.category);

  const toggleRsvp = async () => {
    try {
      if (event.registered) {
        await apiDelete(`/api/events/${event.id}/register`);
      } else {
        await apiPost(`/api/events/${event.id}/register`);
      }
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(event.registered ? 'RSVP cancelled' : 'You are going!');
    } catch (err) {
      log.error({ id: event.id }, 'Failed to update RSVP', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update RSVP');
    }
  };

  const cancelEvent = async () => {
    if (!window.confirm(`Cancel “${event.title}”?`)) return;
    try {
      await apiDelete(`/api/events/${event.id}`);
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event cancelled');
    } catch (err) {
      log.error({ id: event.id }, 'Failed to cancel event', err);
      toast.error(err instanceof Error ? err.message : 'Failed to cancel event');
    }
  };

  const publish = async () => {
    try {
      await apiPatch(`/api/events/${event.id}`, { isDraft: false });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event published');
    } catch (err) {
      log.error({ id: event.id }, 'Failed to publish event', err);
      toast.error(err instanceof Error ? err.message : 'Failed to publish event');
    }
  };

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden shadow-sm ${
        event.isDraft ? 'border-dashed border-amber-300' : 'border-gray-200'
      }`}
    >
      <div className="flex">
        <div className="w-24 min-w-24 sm:w-28 sm:min-w-28 flex items-center justify-center">
          {event.image ? (
            <div className="relative w-full h-full min-h-32">
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className={`w-full h-full min-h-32 flex items-center justify-center ${iconColor}`}>
              <Icon className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{event.title}</h3>
              {event.category && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                  {event.category}
                </span>
              )}
              {event.isDraft && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                  Draft
                </span>
              )}
              {isOwn && !event.isDraft && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                  Yours
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isOwn && (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/services/events/${event.id}/edit`)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                    aria-label="Edit event"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEvent}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
                    aria-label="Cancel event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {formatEventDate(event.date, event.endDate)}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            {event.location}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Hosted by {event.organizer} · {event.attendeeCount} going
            {event.maxAttendees != null && ` · Capacity ${event.maxAttendees}`}
          </div>

          <div className="mt-3">
            {isOwn ? (
              event.isDraft ? (
                <button
                  type="button"
                  onClick={publish}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Check className="w-4 h-4" />
                  Publish event
                </button>
              ) : (
                <Link
                  href={`/dashboard/services/events/${event.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  View event
                </Link>
              )
            ) : event.registered ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg">
                  <Check className="w-4 h-4" />
                  Going
                </span>
                <button
                  type="button"
                  onClick={toggleRsvp}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel RSVP
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isFull || isPast}
                onClick={toggleRsvp}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg ${
                  isFull || isPast
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isFull ? 'Event full' : isPast ? 'Past event' : 'RSVP'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResidentEventsList() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id ?? '';
  const [filter, setFilter] = useState<FilterKey>('upcoming');

  const {
    data: events = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  });

  const filtered = useMemo(() => {
    const now = Date.now();
    switch (filter) {
      case 'upcoming':
        return events.filter(e => !e.isDraft && new Date(e.date).getTime() >= now);
      case 'attending':
        return events.filter(e => e.registered);
      case 'mine':
        return events.filter(e => e.createdByUserId === currentUserId);
      case 'past':
        return events.filter(e => !e.isDraft && new Date(e.date).getTime() < now);
    }
  }, [events, filter, currentUserId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 mb-3">Failed to load events</p>
        <button
          onClick={() => void refetch()}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto">
          {(
            [
              ['upcoming', 'Upcoming'],
              ['attending', 'Attending'],
              ['mine', 'My events'],
              ['past', 'Past'],
            ] as [FilterKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-sm whitespace-nowrap rounded-full transition ${
                filter === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Link
          href="/dashboard/services/events/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Create event
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {filter === 'mine'
              ? 'You haven’t created any events yet.'
              : filter === 'attending'
                ? 'You aren’t attending any events yet.'
                : filter === 'past'
                  ? 'No past events.'
                  : 'No upcoming events.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(event => (
            <EventCard key={event.id} event={event} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
