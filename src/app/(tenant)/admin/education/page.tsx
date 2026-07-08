'use client';

import Image from 'next/image';
import { Breadcrumbs } from '@shared/ui';
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
        <Image src="/platform/education-red.svg" alt="" width={32} height={32} />
        <h1 className="text-2xl font-bold text-gray-900">Education Portal</h1>
      </div>
      <EducationList />
    </div>
  );
}
