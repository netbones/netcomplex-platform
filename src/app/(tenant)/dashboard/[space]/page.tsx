'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { SPACE_SLUGS, type SpaceId } from '@widgets/dashboard';
import { SpaceLayoutWithErrorBoundary } from '@widgets/dashboard';
import { AdminLayer } from '@widgets/dashboard';
import { ServicesLayer } from '@widgets/dashboard';
import { MessagesLayer } from '@widgets/dashboard';

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

  // Admin space uses AdminLayer (command panel + domain grid)
  if (spaceId === 'admin') {
    return <AdminLayer />;
  }

  // Services space uses ServicesLayer (urgency zone + domain grid)
  if (spaceId === 'services') {
    return <ServicesLayer />;
  }

  // Messages space uses MessagesLayer (urgency zone + domain grid)
  if (spaceId === 'messages') {
    return <MessagesLayer />;
  }

  // All other spaces (home, community) use SpaceLayout (DnD widget grid)
  return <SpaceLayoutWithErrorBoundary spaceId={spaceId} />;
}
