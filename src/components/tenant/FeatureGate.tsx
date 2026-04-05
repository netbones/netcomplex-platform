'use client';

import { useTenant } from '@/lib/tenant/context';
import { isFeatureEnabled } from '@/lib/features/registry';

/**
 * FeatureGate - Conditionally render content based on tenant feature flags
 *
 * HYBRID APPROACH (TierGuard + FeatureGate):
 * - TierGuard checks subscription tier (sprout/grove/forest) for baseline access
 * - FeatureGate allows tenant-specific enable/disable overrides
 *
 * Usage:
 *
 * // Wrapped by TierGuard for tier baseline
 * <TierGuard feature="feature.analytics" tier={tenant.subscriptionTier}>
 *   <FeatureGate feature="analytics.enabled">
 *     <AnalyticsDashboard />
 *   </FeatureGate>
 * </TierGuard>
 *
 * // Or standalone with tier baseline passed in
 * <FeatureGate feature="analytics.enabled" tierBaseline={tenant.subscriptionTier}>
 *   <AnalyticsDashboard />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const tenant = useTenant();
  if (!tenant || !isFeatureEnabled(tenant, feature)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
