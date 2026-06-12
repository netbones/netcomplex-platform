import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@shared/ui';
import { ResourceForm } from '@widgets/admin';
import { db, resources } from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@/entities/tenant/api/with-tenant';

interface EditResourcePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  const { id } = await params;
  const { tenantId } = await withTenant();

  // Fetch resource directly from Drizzle — no visibility filtering for admin edit
  const [resource] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)));

  if (!resource) {
    notFound();
  }

  // Transform DB types to form-expected types
  const formData = {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    category: resource.category,
    fileUrl: resource.fileUrl,
    fileType: resource.fileType,
    fileSize: resource.fileSize,
    externalUrl: resource.externalUrl,
    bodyContent: resource.bodyContent as Record<string, unknown> | null,
    version: resource.version,
    visibility: resource.visibility,
    publishedAt: resource.publishedAt ? resource.publishedAt.toISOString().slice(0, 16) : null,
  };

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
      <ResourceForm initialData={formData} />
    </div>
  );
}
