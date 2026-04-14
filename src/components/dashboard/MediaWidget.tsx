'use client';

import { ErrorBoundary, MediaLibrary } from '@shared/ui';

export function MediaWidget() {
  return (
    <ErrorBoundary>
      <MediaLibrary />
    </ErrorBoundary>
  );
}
