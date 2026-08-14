'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, User, ArrowLeft, Pencil, Trash2, Check, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { LoadingSpinner, Breadcrumbs } from '@shared/ui';
import { apiGet, apiDelete, apiPatch } from '@/shared/api/http-client';
import { authClient } from '@/shared/api/auth-client';
import { EventAttendance } from '@features/events';

interface EventDetail {
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
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id ?? '';

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isOwn =
    event != null && event.createdByUserId != null && event.createdByUserId === currentUserId;

  useEffect(() => {
    async function fetchEvent() {
      try {
        const { data } = await apiGet<EventDetail>(`/api/events/${id}`);
        setEvent(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id]);

  const handlePublish = async () => {
    if (!event) return;
    setPublishing(true);
    try {
      await apiPatch(`/api/events/${event.id}`, { isDraft: false });
      setEvent({ ...event, isDraft: false });
      toast.success('Event published');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish event');
    } finally {
      setPublishing(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!event) return;
    if (!window.confirm(`Cancel “${event.title}”? This will hide it from residents.`)) return;
    setCancelling(true);
    try {
      await apiDelete(`/api/events/${event.id}`);
      toast.success('Event cancelled');
      router.push('/dashboard/services/events');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel event');
      setCancelling(false);
    }
  };

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
            Back to Events
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
            <div className="relative h-48 sm:h-64 bg-gray-100">
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

              {isOwn && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {event.isDraft ? (
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {publishing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Publish
                    </button>
                  ) : (
                    <Link
                      href={`/dashboard/services/events/${event.id}/edit`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </Link>
                  )}
                  <button
                    onClick={handleCancelEvent}
                    disabled={cancelling}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {event.isDraft && (
              <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-medium mb-4">
                Draft — only you can see this event
              </div>
            )}

            <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>
                  {formatDate(event.date)} at {formatTime(event.date)}
                  {event.endDate && ` – ${formatTime(event.endDate)}`}
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

        {isOwn ? (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6 text-sm text-gray-500">
            This is your event. Manage it with the actions above, or head back to the list to see
            who has RSVPed.
          </div>
        ) : (
          <div className="mt-6">
            <EventAttendance eventId={event.id} />
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/dashboard/services/events"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>
        </div>
      </div>
    </div>
  );
}
