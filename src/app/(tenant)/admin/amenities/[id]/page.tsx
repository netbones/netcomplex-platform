'use client';

import { use } from 'react';
import { AmenityEditForm } from '@pages/admin';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: PageProps) {
  const { id } = use(params);
  return <AmenityEditForm amenityId={id} />;
}
