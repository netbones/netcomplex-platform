'use client';

import { ErrorBoundary } from '@shared/ui';
import { UsersListSection } from '@widgets/admin/ui/UsersListSection';

export default function AdminUsersPage() {
  return (
    <ErrorBoundary>
      <UsersListSection />
    </ErrorBoundary>
  );
}
