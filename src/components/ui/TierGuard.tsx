'use client';

import { ReactNode } from 'react';
import { TierLevel, hasFeature, canAccessPage, canUseWidget } from '@/lib/features/registry';

interface TierGuardProps {
  children: ReactNode;
  feature?: string;
  page?: string;
  widget?: string;
  tier: TierLevel;
  featureFlags?: Record<string, boolean>;
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

/**
 * TierGuard - Conditionally render content based on tenant subscription tier
 *
 * Usage:
 *
 * // Feature flag check
 * <TierGuard feature="feature.customBranding" tier={tenantTier}>
 *   <CustomBrandingSettings />
 * </TierGuard>
 *
 * // Page access check
 * <TierGuard page="analytics" tier={tenantTier}>
 *   <AnalyticsDashboard />
 * </TierGuard>
 *
 * // Widget check
 * <TierGuard widget="analytics-widget" tier={tenantTier}>
 *   <AnalyticsWidget />
 * </TierGuard>
 */
export function TierGuard({
  children,
  feature,
  page,
  widget,
  tier,
  featureFlags = {},
  fallback = null,
  showUpgrade = false,
}: TierGuardProps) {
  let hasAccess = false;

  if (feature) {
    hasAccess = hasFeature(feature, tier, featureFlags);
  } else if (page) {
    hasAccess = canAccessPage(page, tier, featureFlags);
  } else if (widget) {
    hasAccess = canUseWidget(widget, tier);
  } else {
    // No restriction specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    if (showUpgrade) {
      return <UpgradePrompt feature={feature} page={page} widget={widget} currentTier={tier} />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Upgrade prompt shown when feature is not available
function UpgradePrompt({
  feature,
  page,
  widget,
  currentTier,
}: {
  feature?: string;
  page?: string;
  widget?: string;
  currentTier: TierLevel;
}) {
  const nextTier = currentTier === 'sprout' ? 'Grove' : 'Forest';

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <div className="text-4xl mb-3">🌱</div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">Upgrade to {nextTier}</h3>
      <p className="text-sm text-gray-500 text-center mb-3">
        {feature && `The "${feature}" feature requires a higher tier.`}
        {page && `The "${page}" page requires a higher tier.`}
        {widget && `The "${widget}" requires a higher tier.`}
      </p>
      <a
        href="/admin/upgrade"
        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
      >
        Upgrade to {nextTier}
      </a>
    </div>
  );
}

export default TierGuard;
