import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantById, updateTenant } from '@entities/tenant/server';
import { TIERS, FEATURE_REGISTRY, WIDGET_REGISTRY } from '@entities/tenant';
import type { TierLevel } from '@entities/tenant';
import { FeaturesForm } from '@features/admin';

interface Props {
  params: Promise<{ id: string }>;
}

async function FeatureManager({ id }: { id: string }) {
  const tenant = await getTenantById(id);

  if (!tenant) {
    return notFound();
  }

  const tenantTier = (tenant.subscriptionTier || 'core') as TierLevel;
  const tierDef = TIERS[tenantTier];

  const allFeatures = [
    ...Object.values(FEATURE_REGISTRY).map(f => ({
      key: f.key,
      tier: f.tier,
      category: f.category,
      label: f.label,
      description: f.description,
    })),
    ...Object.values(WIDGET_REGISTRY).map(w => ({
      key: w.key,
      tier: w.tier,
      category: 'widget',
      label: w.label,
      description: w.description,
    })),
  ];

  async function updateTier(formData: FormData) {
    'use server';
    const newTier = formData.get('tier') as TierLevel;
    await updateTenant(id, { subscriptionTier: newTier });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/dashboard/admin/platform" className="hover:text-gray-700">
            Platform
          </Link>
          <span>/</span>
          <span>{tenant.name}</span>
          <span>/</span>
          <span className="text-gray-900">Features</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Feature Management</h1>
        <p className="text-gray-500 mt-1">
          Configure subscription tier and feature access for {tenant.name}
        </p>
        <div className="mt-2 flex gap-2">
          <Link
            href={`/admin/platform/${id}/edit`}
            className="text-sm text-indigo-600 hover:text-indigo-900"
          >
            Edit Branding
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Current Subscription</h2>
        <div className="flex items-center gap-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: tierDef.color }}
          >
            {tenantTier === 'core' ? '🏗️' : tenantTier === 'foundation' ? '🌊' : '🏛️'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold">{tierDef.name}</span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  tenantTier === 'pro-max'
                    ? 'bg-slate-100 text-slate-700'
                    : tenantTier === 'foundation'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                }`}
              >
                {tenantTier === 'pro-max'
                  ? 'Enterprise'
                  : tenantTier === 'foundation'
                    ? 'Growth'
                    : 'Foundation'}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{tierDef.description}</p>
            <p className="text-gray-500 text-sm mt-1">
              Pages: {tenant.pageCount} / {tenant.maxPages === -1 ? '∞' : tenant.maxPages}
            </p>
          </div>
          <form action={updateTier} className="flex items-center gap-2">
            <select
              name="tier"
              defaultValue={tenantTier}
              className="border rounded-md px-3 py-2 text-sm"
            ></select>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
            >
              Update
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Tier Comparison</h2>
        <div className="grid grid-cols-3 gap-4">
          {(['core', 'foundation', 'pro-max'] as TierLevel[]).map(t => {
            const tier = TIERS[t];
            const isCurrent = t === tenantTier;
            return (
              <div
                key={t}
                className={`border-2 rounded-lg p-4 ${
                  isCurrent ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">
                    {t === 'core' ? '🏗️' : t === 'foundation' ? '🌊' : '🏛️'}
                  </span>
                  <span className="font-semibold">{tier.name}</span>
                </div>
                <p className="text-sm text-gray-500">
                  {tier.maxPages === -1 ? 'Unlimited' : tier.maxPages} pages
                </p>
                {isCurrent && <span className="text-xs text-indigo-600 font-medium">Current</span>}
              </div>
            );
          })}
        </div>
      </div>

      <FeaturesForm
        tenant={{
          id: tenant.id,
          name: tenant.name,
          subscriptionTier: tenant.subscriptionTier,
          featureFlags: tenant.featureFlags,
        }}
        allFeatures={allFeatures}
      />
    </div>
  );
}

export function TenantFeaturePage({ params }: Props) {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <FeatureManagerAwaiter params={params} />
    </Suspense>
  );
}

interface AwaiterProps {
  params: Promise<{ id: string }>;
}

async function FeatureManagerAwaiter({ params }: AwaiterProps) {
  const { id } = await params;
  return <FeatureManager id={id} />;
}
