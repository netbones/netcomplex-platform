'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumbs } from '@shared/ui';
import { EventForm } from '@widgets/admin';
import { createComponentLogger } from '@shared/lib';
import { apiGet } from '@/shared/api/http-client';

const log = createComponentLogger('resident-edit-event-page');

interface Event {
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

export default function ResidentEditEventPage() {
  const params = useParams() as { id?: string } | null;
  const id = params?.id;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    apiGet<Event>(`/api/events/${id}`)
      .then(({ data }) => {
        setEvent(data);
        setLoading(false);
      })
      .catch(err => {
        log.error({}, 'Error fetching event', err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading event...</div>;
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="p-8 text-center text-gray-500">
          Event not found
          <div className="mt-4">
            <Link
              href="/dashboard/services/events"
              className="text-indigo-600 hover:text-indigo-900"
            >
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Services', href: '/dashboard/services' },
          { label: 'Events', href: '/dashboard/services/events' },
          { label: 'Edit Event' },
        ]}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
        <Link
          href="/dashboard/services/events"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>
      </div>

      <EventForm
        redirectPath="/dashboard/services/events"
        initialData={{
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          endDate: event.endDate,
          location: event.location,
          organizer: event.organizer,
          image: event.image,
          isPublic: event.isPublic,
          isDraft: event.isDraft,
          category: event.category,
          maxAttendees: event.maxAttendees,
          createdByUserId: event.createdByUserId,
        }}
      />
    </div>
  );
}
