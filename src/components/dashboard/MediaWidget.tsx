'use client';

import { MediaLibrary } from '@shared/ui/MediaLibrary';
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';

export function MediaWidget() {
  return (
    <ErrorBoundary>
      <MediaLibrary />
    </ErrorBoundary>
  );
}
