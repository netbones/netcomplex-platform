import { Suspense } from 'react';
import { getTenantById, updateTenant } from '@/lib/tenant';
import { TIERS, FEATURE_REGISTRY, WIDGET_REGISTRY, type TierLevel } from '@/lib/features/registry';
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
}

async function FeatureManager({ id }: { id: string }) {
  const tenant = await getTenantById(id);

  if (!tenant) {
    return <div className="p-8 text-center">Tenant not found</div>;
  }

  const tenantTier = (tenant.subscriptionTier || 'sprout') as TierLevel;
  const tierDef = TIERS[tenantTier];
  const featureFlags = tenant.featureFlags;
  const pageCount = tenant.pageCount;
  const maxPages = tenant.maxPages;

  const tierOrder: TierLevel[] = ['sprout', 'grove', 'forest'];
  const currentTierIndex = tierOrder.indexOf(tenantTier);

  // Group features by category
  const pages = Object.values(FEATURE_REGISTRY).filter(f => f.category === 'page');
  const features = Object.values(FEATURE_REGISTRY).filter(f => f.category === 'feature');
  const widgets = Object.values(WIDGET_REGISTRY);

  function getAccessLevel(featureTier: TierLevel): 'allowed' | 'upgrade' | 'locked' {
    const featureTierIndex = tierOrder.indexOf(featureTier);
    if (featureTierIndex <= currentTierIndex) return 'allowed';
    return 'locked';
  }

  async function updateTier(formData: FormData) {
    'use server';
    const newTier = formData.get('tier') as TierLevel;
    await updateTenant(id, { subscriptionTier: newTier });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin/platform" className="hover:text-gray-700">
            Platform
          </Link>
          <span>/</span>
          <span>{tenant.name}</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Feature Management</h1>
        <p className="text-gray-500 mt-1">
          Configure subscription tier and feature access for {tenant.name}
        </p>
      </div>

      {/* Current Tier Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Current Subscription</h2>
        <div className="flex items-center gap-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: tierDef.color }}
          >
            {tenantTier === 'sprout' ? '🌱' : tenantTier === 'grove' ? '🌳' : '🌲'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold">{tierDef.name}</span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  tenantTier === 'forest'
                    ? 'bg-slate-100 text-slate-700'
                    : tenantTier === 'grove'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                }`}
              >
                {tenantTier === 'forest'
                  ? 'Enterprise'
                  : tenantTier === 'grove'
                    ? 'Growth'
                    : 'Starter'}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{tierDef.description}</p>
            <p className="text-gray-500 text-sm mt-1">
              Pages: {pageCount} / {maxPages === -1 ? '∞' : maxPages}
            </p>
          </div>
          <form action={updateTier} className="flex items-center gap-2">
            <select
              name="tier"
              defaultValue={tenantTier}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="sprout">🌱 Sprout</option>
              <option value="grove">🌳 Grove</option>
              <option value="forest">🌲 Forest</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
            >
              Update
            </button>
          </form>
        </div>
      </div>

      {/* Tier Comparison */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Tier Comparison</h2>
        <div className="grid grid-cols-3 gap-4">
          {(['sprout', 'grove', 'forest'] as TierLevel[]).map(t => {
            const tier = TIERS[t];
            const isCurrent = t === tenantTier;
            return (
              <div
                key={t}
                className={`border-2 rounded-lg p-4 ${isCurrent ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">
                    {t === 'sprout' ? '🌱' : t === 'grove' ? '🌳' : '🌲'}
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

      {/* Pages */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Pages</h2>
        <div className="space-y-2">
          {pages.map(page => {
            const access = getAccessLevel(page.tier);
            return (
              <div
                key={page.key}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  access === 'allowed' ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      access === 'allowed' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{page.label}</p>
                    <p className="text-xs text-gray-500">{page.description}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                  {access === 'allowed' ? '✓ Available' : `${page.tier} required`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Features</h2>
        <div className="space-y-2">
          {features.map(feature => {
            const access = getAccessLevel(feature.tier);
            return (
              <div
                key={feature.key}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  access === 'allowed' ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      access === 'allowed' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{feature.label}</p>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                  {access === 'allowed' ? '✓ Enabled' : `${feature.tier} required`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Widgets */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Widgets</h2>
        <div className="space-y-2">
          {widgets.map(widget => {
            const access = getAccessLevel(widget.tier);
            return (
              <div
                key={widget.key}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  access === 'allowed' ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      access === 'allowed' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{widget.label}</p>
                    <p className="text-xs text-gray-500">{widget.description}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                  {access === 'allowed' ? '✓ Available' : `${widget.tier} required`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default async function TenantFeaturePage({ params }: Props) {
  const { id } = await params;

  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <FeatureManager id={id} />
    </Suspense>
  );
}
