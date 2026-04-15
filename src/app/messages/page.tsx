import { MessagesPage } from '@pages/chat';
import { Suspense } from 'react';
import { LoadingSpinner } from '@shared/ui';

export default function MessagesRoute() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MessagesPage />
    </Suspense>
  );
}
