'use client';

// import { useTenant } from '@entities/tenant/api/context';
// import { isFeatureEnabled } from '@entities/tenant/api/features/registry';
import { BookingsPage } from '@pages/booking';
import { Suspense } from 'react';
import { LoadingSpinner } from '@shared/ui';

function BookingFeatureGate({ children }: { children: React.ReactNode }) {
  // Temporarily disabled tenant check - always allow bookings for now
  // TODO: Re-enable tenant-based feature gating after fixing context issues

  return <>{children}</>;
}

export default function BookingsRoute() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <BookingFeatureGate>
        <BookingsPage />
      </BookingFeatureGate>
    </Suspense>
  );
}
