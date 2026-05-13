'use client';

// import { useTenant } from '../api/context';
import { useModuleEnabled } from '../api/use-enabled-modules';

/**
 * FeatureGate - Conditionally render content based on module enablement
 *
 * SCOPE: Module-based feature toggle
 * - Checks tenant's tier + tenant_modules for module enablement
 * - Tier hierarchy: STANDARD < PREMIUM < ENTERPRISE
 *
 * Usage:
 *
 * <FeatureGate module="maintenance">
 *   <MaintenancePage />
 * </FeatureGate>
 *
 * // With fallback
 * <FeatureGate module="bookings" fallback={<BookingsDisabled />}>
 *   <BookingPage />
 * </FeatureGate>
 */
export function FeatureGate({
  module: _module,
  children,
  fallback = null,
}: {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  // const tenant = useTenant();

  // If no tenant context, don't render
  // Temporarily disabled tenant check
  // if (!tenant) {
  //   return <>{fallback}</>;
  // }

  // Use module-enabled hook for server-fetched data
  // Temporarily disabled - needs tenant context
  // const { isEnabled, isLoading } = useModuleEnabled(tenant.id, module);
  const { isEnabled, isLoading } = { isEnabled: true, isLoading: false };

  if (isLoading) {
    return null; // Or loading skeleton
  }

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * TierGuard - Check if tenant tier satisfies minimum tier requirement
 *
 * @deprecated Use FeatureGate with module prop instead
 */
export function TierGuard({
  tier: _tier,
  children,
  fallback: _fallback = null,
}: {
  tier: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  // const tenant = useTenant();

  // Tier hierarchy - temporarily disabled
  // const tierLevels: Record<string, number> = {
  //   STANDARD: 1,
  //   PREMIUM: 2,
  //   ENTERPRISE: 3,
  // };

  // const tenantTier = tierLevels[tenant?.tier ?? 'STANDARD'];
  // const requiredTier = tierLevels[tier] ?? 1;

  // if (tenantTier < requiredTier) {
  //   return <>{fallback}</>;
  // }

  return <>{children}</>;
}
