'use client';

import { Breadcrumbs } from '@shared/ui';
import { CompetitionForm } from '@widgets/admin';

export default function NewCompetitionPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Competitions', href: '/admin/competitions' },
          { label: 'New' },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Competition</h1>
      </div>

      <CompetitionForm />
    </div>
  );
}
