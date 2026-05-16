'use client';

import { Breadcrumbs } from '@shared/ui';
import { ResourceForm } from '@/widgets/admin/ui/ResourceForm';

export default function NewResourcePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Resources', href: '/admin/resources' },
          { label: 'New' },
        ]}
      />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Resource</h1>
      <ResourceForm />
    </div>
  );
}
