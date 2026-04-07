'use client';

import { useTenant } from '@/lib/tenant/context';
import { isFeatureEnabled } from '@/lib/features/registry';

/**
 * FeatureGate - Conditionally render content based on tenant feature flags
 *
 * SCOPE: Tenant-specific feature toggle
 * - Checks tenant's featureFlags for granular enable/disable overrides
 * - Use alongside TierGuard for hybrid approach:
 *   - TierGuard provides subscription tier baseline
 *   - FeatureGate allows tenant-specific customizations
 *
 * vs TierGuard: Use TierGuard for tier-based access, FeatureGate for tenant-specific flags
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
