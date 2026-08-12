'use client';

import { useTenant, isFeatureEnabled } from '@entities/tenant';
import { BookingsPage } from '@pages/booking';
import { Suspense } from 'react';
import { LoadingSpinner } from '@shared/ui';
import { Ban } from 'lucide-react';
import Link from 'next/link';

function AmenitiesFeatureGate({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();

  if (!tenant) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isFeatureEnabled(tenant, 'page.bookings')) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <Ban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Amenities Unavailable</h2>
          <p className="text-gray-500">Community amenities are not enabled for your community.</p>
          <Link
            href="/"
            className="mt-4 inline-block px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AmenitiesRoute() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AmenitiesFeatureGate>
        <BookingsPage />
      </AmenitiesFeatureGate>
    </Suspense>
  );
}
