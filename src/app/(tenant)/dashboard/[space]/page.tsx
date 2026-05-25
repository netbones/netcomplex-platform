'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { SPACE_SLUGS, type SpaceId } from '@widgets/dashboard/model/spaces';
import { SpaceLayoutWithErrorBoundary } from '@widgets/dashboard/ui/SpaceLayout';

interface SpacePageProps {
  params: Promise<{ space: string }>;
}

export default function SpacePage({ params }: SpacePageProps) {
  const { space } = use(params);

  // Validate space slug
  if (!SPACE_SLUGS.includes(space as SpaceId)) {
    notFound();
  }

  return <SpaceLayoutWithErrorBoundary spaceId={space as SpaceId} />;
}
