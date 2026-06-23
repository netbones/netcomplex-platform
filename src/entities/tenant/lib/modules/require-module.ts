/**
 * Drizzle helpers for module queries
 *
 * Usage:
 *   import { requireModule, tierSatisfies } from '@entities/tenant-module';
 *
 *   // In queries
 *   const modules = await db
 *     .select()
 *     .from(platformModules)
 *     .where(tierSatisfies(tenant));
 */

import type { TenantTier } from '@shared/lib';
import type { TenantTier } from '@shared/lib';

// ============================================
// TIER HELPERS
// ============================================

const TIER_ORDER: Record<TenantTier, number> = {
  STANDARD: 1,
  PREMIUM: 2,
  ENTERPRISE: 3,
};

/**
 * Get tier level number for comparison
 */
export function getTierLevel(tier: TenantTier): number {
  return TIER_ORDER[tier] ?? 0;
}

/**
 * Check if tenant tier satisfies module minTier
 */
export function tierSatisfies(tenantTier: TenantTier, moduleMinTier: TenantTier): boolean {
  return TIER_ORDER[tenantTier] >= TIER_ORDER[moduleMinTier];
}

/**
 * Get modules that a tenant can access based on tier
 * Returns array of module keys
 */
export function getAccessibleModules(tenantTier: TenantTier): TenantTier[] {
  const minLevel = TIER_ORDER[tenantTier];

  // Return all tiers at or below tenant tier
  return (Object.keys(TIER_ORDER) as TenantTier[]).filter(tier => TIER_ORDER[tier] >= minLevel);
}

/**
 * Check if tenant meets tier requirement
 */
export function meetsTierRequirement(tenantTier: TenantTier, requiredTier: TenantTier): boolean {
  return tierSatisfies(tenantTier, requiredTier);
}

// ============================================
// EXPORTS FOR OTHER MODULES
// ============================================

export { TIER_ORDER };
