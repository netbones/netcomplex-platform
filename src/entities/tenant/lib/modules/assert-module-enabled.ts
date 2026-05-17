/**
 * Module enforcement helpers for API routes
 *
 * Usage in API routes:
 *   import { assertModuleEnabled } from '@/lib/modules/assert-module-enabled';
 *
 *   // At start of handler
 *   await assertModuleEnabled(tenantId, 'maintenance');
 */

import { db, tenantModules, platformModules, tenants } from '@api/db';
import { eq, and } from 'drizzle-orm';
import type { TenantTier } from '@entities/tenant';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('assert-module-enabled');

// Tier hierarchy for enforcement
const TIER_LEVELS: Record<TenantTier, number> = {
  STANDARD: 1,
  PREMIUM: 2,
  ENTERPRISE: 3,
};

/**
 * Check if a module is enabled for a tenant
 *
 * Logic:
 * 1. For Core modules (no minTier) → always enabled
 * 2. Check tenant tier >= module minTier
 * 3. Check tenant_modules table for explicit enabled status
 */
export async function isModuleEnabled(tenantId: string, moduleKey: string): Promise<boolean> {
  // Get platform module definition
  const [platformModule] = await db
    .select()
    .from(platformModules)
    .where(eq(platformModules.key, moduleKey))
    .limit(1);

  if (!platformModule) {
    // Module doesn't exist → treat as disabled for safety
    log.warn('Module "%s" not found in platform_modules', moduleKey);
    return false;
  }

  // Get tenant tier
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

  if (!tenant) {
    return false;
  }

  // Enforce tier requirement
  const tenantTierLevel = TIER_LEVELS[tenant.tier] || 0;
  const moduleTierLevel = TIER_LEVELS[platformModule.minTier] || 0;

  if (tenantTierLevel < moduleTierLevel) {
    return false;
  }

  // Check tenant_modules for explicit override
  const [tenantModule] = await db
    .select()
    .from(tenantModules)
    .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.moduleKey, moduleKey)))
    .limit(1);

  // If no explicit record, use platform default
  if (!tenantModule) {
    return platformModule.defaultEnabled;
  }

  return tenantModule.enabled;
}

/**
 * Assert module is enabled, throws if not
 *
 * @throws Error with message if module not enabled
 */
export async function assertModuleEnabled(tenantId: string, moduleKey: string): Promise<void> {
  const enabled = await isModuleEnabled(tenantId, moduleKey);

  if (!enabled) {
    throw new Error(`Module "${moduleKey}" is not enabled for this tenant`);
  }
}

/**
 * Get all enabled modules for a tenant
 * Returns module keys that are enabled based on tier + explicit settings
 */
export async function getEnabledModules(tenantId: string): Promise<string[]> {
  // Get all platform modules
  const allModules = await db.select().from(platformModules);

  // Get tenant tier
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

  if (!tenant) {
    return [];
  }

  const tenantTierLevel = TIER_LEVELS[tenant.tier] || 0;
  const enabled: string[] = [];

  for (const mod of allModules) {
    const moduleTierLevel = TIER_LEVELS[mod.minTier] || 0;

    // Check tier requirement
    if (tenantTierLevel < moduleTierLevel) {
      continue;
    }

    // Check tenant_modules
    const [tenantModule] = await db
      .select()
      .from(tenantModules)
      .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.moduleKey, mod.key)))
      .limit(1);

    // Use default if no explicit record
    const isEnabled = tenantModule?.enabled ?? mod.defaultEnabled;

    if (isEnabled) {
      enabled.push(mod.key);
    }
  }

  return enabled;
}
