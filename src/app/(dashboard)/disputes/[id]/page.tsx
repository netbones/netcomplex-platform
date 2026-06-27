import { DisputeDetailPage } from '@pages/disputes';
import { Suspense } from 'react';
import { LoadingSpinner } from '@shared/ui';

export default async function DisputeDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DisputeDetailPage disputeId={id} />
    </Suspense>
  );
}
