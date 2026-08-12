'use client';

import Link from 'next/link';
import { Breadcrumbs } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { EventList } from '@widgets/admin';

import { Plus } from 'lucide-react';
export default function EventsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Events' }]} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <DomainIconBadge id="events" variant="admin" size="md" />
          Events
        </h1>
        <Link
          href="/admin/events/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="mr-2" />
          New Event
        </Link>
      </div>

      <EventList />
    </div>
  );
}
