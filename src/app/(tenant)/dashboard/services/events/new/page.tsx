'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumbs } from '@shared/ui';
import { EventForm } from '@widgets/admin';

export default function NewEventPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Services', href: '/dashboard/services' },
          { label: 'Events', href: '/dashboard/services/events' },
          { label: 'New Event' },
        ]}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Event</h1>
        <Link
          href="/dashboard/services/events"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>
      </div>

      <EventForm redirectPath="/dashboard/services/events" />
    </div>
  );
}
