'use client';

import { MediaLibrary } from '@/components/ui/MediaLibrary';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function MediaWidget() {
  return (
    <ErrorBoundary>
      <MediaLibrary />
    </ErrorBoundary>
  );
}
