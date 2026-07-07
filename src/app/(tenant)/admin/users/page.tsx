'use client';

import Image from 'next/image';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { AdminUserWidget } from '@widgets/admin';
import { UsersListSection } from '@widgets/admin';

export default function AdminUsersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Admin', href: '/admin' },
            { label: 'Users' },
          ]}
        />

        <div className="flex items-center justify-between mt-6 mb-6">
          <div className="flex items-center gap-3">
            <Image src="/platform/users.svg" alt="" width={32} height={32} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Users</h1>
              <p className="text-sm text-gray-500">Manage community members and roles</p>
            </div>
          </div>
        </div>

        <ErrorBoundary>
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <AdminUserWidget />
          </div>
        </ErrorBoundary>

        <ErrorBoundary>
          <UsersListSection />
        </ErrorBoundary>
      </div>
    </div>
  );
}
