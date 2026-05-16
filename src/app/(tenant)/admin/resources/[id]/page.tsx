'use client';

import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@shared/ui';
import { ResourceForm } from '@/widgets/admin/ui/ResourceForm';

interface EditResourcePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  const { id } = await params;

  // Fetch resource data on the server
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/resources/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    notFound();
  }

  const resource = await res.json();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Resources', href: '/admin/resources' },
          { label: 'Edit' },
        ]}
      />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Resource</h1>
      <ResourceForm initialData={resource} />
    </div>
  );
}
