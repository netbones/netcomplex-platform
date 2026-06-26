import { DisputeDetailPage } from '@pages/disputes';
import { Suspense } from 'react';
import { LoadingSpinner } from '@shared/ui';

export default function DisputeDetailRoute({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DisputeDetailPage disputeId={params.id} />
    </Suspense>
  );
}
