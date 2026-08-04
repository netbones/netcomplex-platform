'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Breadcrumbs } from '@shared/ui';
import { EventForm } from '@widgets/admin';
import { createComponentLogger } from '@shared/lib';
import { apiGet } from '@/shared/api/http-client';

import { ArrowLeft } from 'lucide-react';
const log = createComponentLogger('edit-event-page');

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  image: string | null;
  isPublic: boolean;
}

export default function EditEventPage() {
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="p-8 text-center text-gray-500">
          Event not found
          <div className="mt-4">
            <Link href="/admin/events" className="text-indigo-600 hover:text-indigo-900">
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initialData = {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    location: event.location,
    organizer: event.organizer,
    image: event.image,
    isPublic: event.isPublic,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Events', href: '/admin/events' },
          { label: 'Edit Event' },
        ]}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
        <Link
          href="/admin/events"
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2" />
          Back to Events
        </Link>
      </div>

      <EventForm initialData={initialData} />
    </div>
  );
}
