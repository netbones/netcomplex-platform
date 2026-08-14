'use client';

import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Breadcrumbs } from '@shared/ui';
import { ResidentEventsList } from '@features/events';

export default function ResidentEventsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Services', href: '/dashboard/services' },
            { label: 'Events', href: '/dashboard/services/events' },
          ]}
        />

        <div className="flex items-center justify-between mt-6 mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/services/events/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Create event
            </Link>
            <Link
              href="/dashboard/services"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Services
            </Link>
          </div>
        </div>

        <ResidentEventsList />
      </div>
    </div>
  );
}
