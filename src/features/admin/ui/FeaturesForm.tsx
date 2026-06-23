'use client';

import { useState, useTransition } from 'react';
import type { TenantFeaturesFormProps, FeatureCategory } from '@entities/admin';
import { TIER_ORDER } from '@entities/admin';

export function FeaturesForm({ tenant, allFeatures }: TenantFeaturesFormProps) {
  const [isPending, startTransition] = useTransition();
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>(
    tenant.featureFlags || {}
  );

  const pages = allFeatures.filter(f => f.category === 'page');
  const features = allFeatures.filter(f => f.category === 'feature');
  const widgets = allFeatures.filter(f => f.category === 'widget');

  const categories: FeatureCategory[] = [
    { name: 'Pages', features: pages },
    { name: 'Features', features: features },
    { name: 'Widgets', features: widgets },
  ];

  const currentTierIndex = TIER_ORDER.indexOf(
    tenant.subscriptionTier as (typeof TIER_ORDER)[number]
  );

  function getAccessLevel(featureTier: string): 'allowed' | 'locked' {
    const featureTierIndex = TIER_ORDER.indexOf(featureTier as (typeof TIER_ORDER)[number]);
    if (featureTierIndex <= currentTierIndex) return 'allowed';
    return 'locked';
  }

  function isOverridden(featureKey: string): boolean {
    return featureKey in featureFlags;
  }

  function getStatus(featureKey: string, featureTier: string): string {
    const access = getAccessLevel(featureTier);
    const overridden = isOverridden(featureKey);

    if (overridden) {
      return featureFlags[featureKey] ? 'enabled' : 'disabled';
    }

    if (access === 'locked') return 'locked';
    return 'enabled';
  }

  function getStatusColor(featureKey: string, featureTier: string): string {
    const status = getStatus(featureKey, featureTier);

    if (status === 'enabled') return 'bg-green-500';
    if (status === 'disabled') return 'bg-red-500';
    if (status === 'locked') return 'bg-gray-300';
    return 'bg-green-500';
  }

  function getStatusLabel(featureKey: string, featureTier: string): string {
    const overridden = isOverridden(featureKey);
    const access = getAccessLevel(featureTier);

    if (overridden) {
      return featureFlags[featureKey] ? '✓ Enabled' : '✗ Disabled';
    }

    if (access === 'locked') return '🔒 Locked';
    return '✓ Tier Allowed';
  }

  async function handleToggle(featureKey: string, currentEnabled: boolean) {
    const newFlags = { ...featureFlags, [featureKey]: !currentEnabled };
    setFeatureFlags(newFlags);

    startTransition(async () => {
      await fetch(`/api/admin/platform/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureFlags: newFlags }),
      });
    });
  }

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">How Feature Toggles Work</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • <span className="font-medium">Tier Allowed (green):</span> Feature is included in the
            tenant&apos;s subscription tier
          </li>
          <li>
            • <span className="font-medium">Tenant Overridden (yellow):</span> Admin has explicitly
            enabled/disabled this feature
          </li>
          <li>
            • <span className="font-medium">Locked (gray):</span> Feature requires a higher
            subscription tier
          </li>
        </ul>
      </div>

      {categories.map(category => (
        <div key={category.name} className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">{category.name}</h2>
          <div className="space-y-2">
            {category.features.map(feature => {
              const access = getAccessLevel(feature.tier);
              const overridden = isOverridden(feature.key);
              const enabled = featureFlags[feature.key];

              return (
                <div
                  key={feature.key}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    overridden
                      ? 'border-yellow-300 bg-yellow-50'
                      : access === 'allowed'
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${getStatusColor(feature.key, feature.tier)}`}
                    />
                    <div>
                      <p className="font-medium text-sm">{feature.label}</p>
                      <p className="text-xs text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        overridden
                          ? 'bg-yellow-100 text-yellow-700'
                          : access === 'allowed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {getStatusLabel(feature.key, feature.tier)}
                    </span>
                    {access !== 'locked' && (
                      <button
                        type="button"
                        onClick={() => handleToggle(feature.key, enabled ?? false)}
                        disabled={isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          (enabled ?? access === 'allowed') ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            (enabled ?? access === 'allowed') ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
