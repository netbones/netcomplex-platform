'use client';

import { authClient } from '@/lib/auth-client';
import { Bookshelf } from '@/components/ui/Bookshelf';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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
