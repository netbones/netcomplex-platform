'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { SPACE_SLUGS, type SpaceId } from '@widgets/dashboard/model/spaces';
import { SpaceLayoutWithErrorBoundary } from '@widgets/dashboard/ui/SpaceLayout';
import { AdminLayer } from '@widgets/dashboard/ui/AdminLayer';

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

  // Admin space uses AdminLayer (command panel) instead of SpaceLayout (widget grid)
  if (spaceId === 'admin') {
    return <AdminLayer />;
  }

  return <SpaceLayoutWithErrorBoundary spaceId={spaceId} />;
}
