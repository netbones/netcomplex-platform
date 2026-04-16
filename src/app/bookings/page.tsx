import { BookingsPage } from '@pages/booking';
import { Suspense } from 'react';
import { LoadingSpinner } from '@shared/ui';

export default function BookingsRoute() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <BookingsPage />
    </Suspense>
  );
}
