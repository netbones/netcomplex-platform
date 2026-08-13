'use client';

import { SecurityPage } from '@pages/security';
import { Suspense } from 'react';
import { LoadingSpinner } from '@shared/ui';

export default function SecurityRoute() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SecurityPage />
    </Suspense>
  );
}
