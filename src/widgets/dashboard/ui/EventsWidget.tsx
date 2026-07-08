'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Plus, ArrowRight, Loader2, BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import { useUpcomingEvents } from '@shared/lib/hooks';

interface AttendeePreview {
  name: string;
  avatar: string | null;
}

interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string | null;
  registered: boolean;
  attendeeCount: number;
  attendees: AttendeePreview[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EventsWidget() {
  const { data: rawData, isLoading, isError, refetch } = useUpcomingEvents();
  const events: EventItem[] = (rawData as Record<string, unknown>)?.data ?? rawData ?? [];
  const retry = useCallback(() => refetch(), [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-6">
        <Calendar className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 mb-3">Failed to load events</p>
        <button
          onClick={retry}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 mb-4">No upcoming events</p>
        <Link
          href="/dashboard/services/events/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Event
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map(event => (
        <Link
          key={event.id}
          href={`/dashboard/services/events/${event.id}`}
          className={`flex items-start gap-3 p-3 rounded-lg transition-colors group ${
            event.registered
              ? 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          {event.image ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-200 relative">
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-indigo-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p
                className={`text-sm font-semibold truncate transition-colors ${
                  event.registered ? 'text-indigo-700' : 'text-gray-900 group-hover:text-indigo-600'
                }`}
              >
                {event.title}
              </p>
              {event.registered && <BadgeCheck className="w-4 h-4 text-indigo-500 shrink-0" />}
            </div>
            <p className="text-xs text-gray-500">
              {formatDate(event.date)} at {formatTime(event.date)}
            </p>
            {event.location && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {event.location}
              </p>
            )}

            <div className="flex items-center gap-1.5 mt-1.5">
              {event.attendees.length > 0 && (
                <div className="flex -space-x-1.5">
                  {event.attendees.map((a, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center overflow-hidden relative"
                      title={a.name}
                    >
                      {a.avatar ? (
                        <Image
                          src={a.avatar}
                          alt={a.name}
                          fill
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-[8px] font-medium text-indigo-600">
                          {a.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <span
                className={`text-xs ${event.attendeeCount > 0 ? 'text-gray-500' : 'text-gray-400'}`}
              >
                {event.attendeeCount > 0
                  ? `${event.attendeeCount} ${event.attendeeCount === 1 ? 'attendee' : 'attendees'}`
                  : 'No attendees yet'}
              </span>
            </div>
          </div>

          <ArrowRight
            className={`w-4 h-4 mt-1 shrink-0 transition-colors ${
              event.registered
                ? 'text-indigo-400 group-hover:text-indigo-600'
                : 'text-gray-300 group-hover:text-indigo-500'
            }`}
          />
        </Link>
      ))}

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <Link
          href="/dashboard/services/events/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Event
        </Link>
        <span className="text-xs text-gray-400">{events.length} upcoming</span>
      </div>
    </div>
  );
}
