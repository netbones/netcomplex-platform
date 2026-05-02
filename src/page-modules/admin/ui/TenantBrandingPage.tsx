import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantById } from '@entities/tenant';
import { BrandingForm } from '@features/admin';

interface Props {
  params: Promise<{ id: string }>;
}

async function TenantBrandingEditor({ id }: { id: string }) {
  const tenant = await getTenantById(id);

  if (!tenant) {
    return notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/admin/platform"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          &larr; Back to Platform
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Branding</h1>
        <p className="text-gray-500 mt-1">Customize {tenant.name}&apos;s branding and appearance</p>
      </div>

      <BrandingForm tenant={tenant} />
    </div>
  );
}

export function TenantBrandingPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <TenantBrandingAwaiter params={params} />
    </Suspense>
  );
}

async function TenantBrandingAwaiter({ params }: Props) {
  const { id } = await params;
  return <TenantBrandingEditor id={id} />;
}
