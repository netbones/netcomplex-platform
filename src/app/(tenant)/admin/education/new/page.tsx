'use client';

import { Breadcrumbs } from '@shared/ui';
import { EducationForm } from '@widgets/admin';

export default function NewEducationPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Education Portal', href: '/admin/education' },
          { label: 'New' },
        ]}
      />
      <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-6">Add Education Item</h1>
      <EducationForm />
    </div>
  );
}
