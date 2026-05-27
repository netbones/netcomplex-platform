'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { SPACE_SLUGS, type SpaceId } from '@widgets/dashboard/model/spaces';
import { SpaceLayoutWithErrorBoundary } from '@widgets/dashboard/ui/SpaceLayout';
import { AdminSubLauncher } from '@widgets/dashboard/ui/AdminSubLauncher';
import { UsersListSection } from '@widgets/admin/ui/UsersListSection';

interface SpacePageProps {
  params: Promise<{ space: string }>;
}

export default function SpacePage({ params }: SpacePageProps) {
  const { space } = use(params);

  // Validate space slug
  if (!SPACE_SLUGS.includes(space as SpaceId)) {
    notFound();
  }

  const spaceId = space as SpaceId;

  return (
    <>
      <SpaceLayoutWithErrorBoundary spaceId={spaceId} />
      {/* Admin space: show sub-launcher grid below overview widgets */}
      {spaceId === 'admin' && (
        <>
          <AdminSubLauncher />
          <UsersListSection />
        </>
      )}
    </>
  );
}
