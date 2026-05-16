'use client';

import Link from 'next/link';
import { Breadcrumbs } from '@shared/ui';
import { CompetitionList } from '@/widgets/admin/ui/CompetitionList';

export default function CompetitionsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Competitions' }]} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Competitions</h1>
        <Link
          href="/admin/competitions/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <i className="fas fa-plus mr-2"></i>New Competition
        </Link>
      </div>

      <CompetitionList />
    </div>
  );
}
