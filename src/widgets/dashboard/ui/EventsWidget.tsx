'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@shared/ui';
import { logError } from '@shared/lib';

interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
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
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        const res = await fetch('/api/events?limit=5&upcoming=true');
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const body = await res.json();
        if (!cancelled) {
          setEvents(body?.data ?? body ?? []);
        }
      } catch (err) {
        logError(
          { component: 'EventsWidget', operation: 'fetchUpcoming' },
          'Failed to fetch events',
          err
        );
        if (!cancelled) setError('Failed to load events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <Calendar className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 mb-3">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
          }}
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
          href="/dashboard/services"
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
          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
        >
          <Calendar className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 truncate transition-colors">
              {event.title}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(event.date)} at {formatTime(event.date)}
            </p>
            {event.location && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {event.location}
              </p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 mt-1 shrink-0 transition-colors" />
        </Link>
      ))}

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <Link
          href="/dashboard/services"
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
