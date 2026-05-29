'use client';

import { ErrorBoundary } from '@shared/ui';
import { UsersListSection } from '@widgets/admin/ui/UsersListSection';

export default function AdminUsersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ErrorBoundary>
        <UsersListSection />
      </ErrorBoundary>
    </div>
  );
}
