'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { SPACES, SPACE_SLUGS, type SpaceId } from '@widgets/dashboard/model/spaces';

interface SpacePageProps {
  params: Promise<{ space: string }>;
}

export default function SpacePage({ params }: SpacePageProps) {
  const { space } = use(params);

  // Validate space slug
  if (!SPACE_SLUGS.includes(space as SpaceId)) {
    notFound();
  }

  const spaceDef = SPACES[space as SpaceId];
  const Icon = spaceDef.icon;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Icon className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">{spaceDef.labelKey}</h1>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">Space content coming soon</p>
        </div>
      </div>
    </div>
  );
}
