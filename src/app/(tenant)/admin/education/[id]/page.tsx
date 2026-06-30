'use client';

import { useSearchParams } from 'next/navigation';
import { Breadcrumbs } from '@shared/ui';
import { EducationForm } from '@widgets/admin';

export default function EditEducationItemPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'bursary';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Education Portal', href: '/admin/education' },
          { label: 'Edit' },
        ]}
      />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {type === 'bursary' ? 'Edit Bursary' : 'Edit Resource'}
      </h1>
      <EducationForm />
    </div>
  );
}
