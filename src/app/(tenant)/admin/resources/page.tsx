'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumbs } from '@shared/ui';
import { ResourceList } from '@widgets/admin';

export default function ResourcesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Resources' }]} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Image src="/platform/resources.svg" alt="" width={32} height={32} />
          Resources
        </h1>
        <Link
          href="/admin/resources/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <i className="fas fa-plus mr-2"></i>New Resource
        </Link>
      </div>

      <ResourceList />
    </div>
  );
}
