'use client';

import { authClient } from '@api/auth-client';
import { Bookshelf, ErrorBoundary } from '@shared/ui';

export function BookshelfWidget() {
  const { data: session } = authClient.useSession();

  if (!session?.user?.id) {
    return (
      <ErrorBoundary>
        <div className="text-center py-4 text-gray-500">
          <p>Please log in to view your bookshelf</p>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Bookshelf userId={session.user.id} editable={true} viewMode="grid" />
    </ErrorBoundary>
  );
}
