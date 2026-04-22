'use client';

import { useTenant } from '@api/tenant';
import { isFeatureEnabled } from '@api/features/registry';
import { BookingsPage } from '@pages/booking';
import { Suspense } from 'react';
import { LoadingSpinner } from '@shared/ui';

function BookingFeatureGate({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();

  // Check if feature flag is enabled
  if (!tenant || !isFeatureEnabled(tenant, 'feature.facilityBooking')) {
    return null;
  }

  // Check if tenant has configured any facilities
  const hasFacilities = tenant.facilities && tenant.facilities.length > 0;
  if (!hasFacilities) {
    return null;
  }

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
