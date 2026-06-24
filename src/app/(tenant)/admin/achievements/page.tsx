'use client';

import { Breadcrumbs } from '@shared/ui';
import { AdminAchievementsWidget } from '@widgets/admin';

export default function AchievementsAdminPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Achievements' }]} />
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
      </div>
      <AdminAchievementsWidget />
    </div>
  );
}
