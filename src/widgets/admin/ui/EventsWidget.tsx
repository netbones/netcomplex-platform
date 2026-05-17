/**
 * Admin management widget — use in /admin routes only.
 * Displays a management-oriented list of upcoming events.
 */
'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@shared/ui';
import { logError } from '@shared/lib';

export interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  organizer: string;
  description: string;
  isPublic: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function EventsWidget() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUpcomingEvents() {
      try {
        const response = await fetch('/api/events?limit=5&upcoming=true');
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
        }
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        logError(
          { component: 'EventsWidget', operation: 'fetchUpcomingEvents' },
          'Failed to fetch upcoming events',
          err
        );
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    fetchUpcomingEvents();
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetch('/api/events?limit=5&upcoming=true')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
        return res.json();
      })
      .then(data => setEvents(data))
      .catch(err => {
        logError(
          { component: 'EventsWidget', operation: 'retryFetch' },
          'Failed to retry fetch upcoming events',
          err
        );
        setError('Failed to load events');
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="text-center py-4">
          <i className="fas fa-exclamation-circle text-2xl text-red-500 mb-2"></i>
          <p className="text-sm text-gray-600 mb-3">{error}</p>
          <button
            onClick={handleRetry}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </ErrorBoundary>
    );
  }

  if (events.length === 0) {
    return (
      <ErrorBoundary>
        <div className="text-center py-6">
          <i className="fas fa-calendar-xmark text-3xl text-gray-400 mb-3"></i>
          <p className="text-sm text-gray-600 mb-3">No upcoming events</p>
          <a
            href="/admin/events/new"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <i className="fas fa-plus"></i>
            Create Event
          </a>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <ul className="space-y-3">
          {events.map(event => (
            <li
              key={event.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                <i className="fas fa-calendar-day text-indigo-500"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                {event.location && (
                  <p className="text-xs text-gray-400">
                    <i className="fas fa-map-marker-alt mr-1"></i>
                    {event.location}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-3 border-t border-gray-200">
          <a
            href="/admin/events"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            View All Events →
          </a>
        </div>
      </div>
    </ErrorBoundary>
  );
}
