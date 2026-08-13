'use client';

import { AccessControlPage } from '@pages/access-control';
import { Suspense } from 'react';
import { LoadingSpinner } from '@shared/ui';

export default function AccessControlRoute() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AccessControlPage />
    </Suspense>
  );
}
