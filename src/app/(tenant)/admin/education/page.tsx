'use client';

import { Breadcrumbs } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { EducationList } from '@widgets/admin';

export default function EducationAdminPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Education Portal', href: '/admin/education' },
        ]}
      />
      <div className="flex items-center gap-3 mt-6 mb-6">
        <DomainIconBadge id="education" variant="admin" size="md" />
        <h1 className="text-2xl font-bold text-gray-900">Education Portal</h1>
      </div>
      <EducationList />
    </div>
  );
}
