'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, User, ArrowLeft } from 'lucide-react';
import { ErrorBoundary, LoadingSpinner, Breadcrumbs } from '@shared/ui';
import { EventAttendance } from '@features/events';

interface EventDetail {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  image: string | null;
}

interface EventPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EventDetailPage({ params }: EventPageProps) {
  const { id } = use(params);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) throw new Error('Failed');
        const body = await res.json();
        const data = body.success ? body.data : body;
        setEvent(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Event not found</h2>
          <p className="text-gray-500 mb-4">
            This event may have been removed or is no longer available.
          </p>
          <Link
            href="/dashboard/services/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Services', href: '/dashboard/services' },
            { label: 'Events', href: '/dashboard/services/events' },
            { label: event.title, href: `/dashboard/services/events/${event.id}` },
          ]}
        />

        <div className="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
          {event.image && (
            <div className="h-48 sm:h-64 bg-gray-100">
              <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

            <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>
                  {formatDate(event.date)} at {formatTime(event.date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-500" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                <span>Organized by {event.organizer}</span>
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-700">
              {event.description.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <EventAttendance eventId={event.id} />
        </div>

        <div className="mt-6">
          <Link
            href="/dashboard/services/events"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
        </div>
      </div>
    </div>
  );
}
