'use client';

import { Breadcrumbs } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { useSafeTranslation } from '@shared/lib';
import { AdminAchievementsWidget } from '@widgets/admin';

export default function AchievementsAdminPage() {
  const { tx } = useSafeTranslation('admin');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: tx('nav.admin', 'Admin'), href: '/admin' },
          { label: tx('domains.achievements', 'Achievements') },
        ]}
      />
      <div className="flex items-center gap-3 mb-6">
        <DomainIconBadge id="achievements" variant="admin" size="md" />
        <h1 className="text-2xl font-bold text-gray-900">
          {tx('domains.achievements', 'Achievements')}
        </h1>
      </div>
      <AdminAchievementsWidget />
    </div>
  );
}
