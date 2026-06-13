/**
 * Feature Gate — server-side entry point for feature visibility decisions.
 *
 * Public API (locked Phase 1 commitment to Phase 2/3):
 *   - canAccess(ctx, feature, opts?) — 5-layer precedence gate
 *   - resolveGateContext(tenantId, request?) — resolve role/tier from real session
 *   - FeatureKey — 14-key union
 *   - FEATURE_TO_MODULE / FEATURE_TO_FLAG / FEATURE_TO_REGISTRY — mapping tables
 *   - GateReason / GateResult / GateContext — return & context types
 *   - GATE_REASON_TO_ERROR — standard error codes for API routes
 *
 * Precedence (first false wins):
 *   Layer 0: Role (synchronous, in-memory ROLE_PERMISSIONS lookup)
 *   Layer 1: Tier (synchronous, MODULES.tier >= tenant.tier)
 *   Layer 2: Module (DB-backed isModuleEnabled, which does its own tier check too)
 *   Layer 3: PageFlag (DB-backed getPlatformPageFlags)
 *   Layer 4: FeatureToggle (synchronous FEATURE_REGISTRY lookup via hasFeature/canAccessPage)
 */

import { eq } from 'drizzle-orm';

import { isModuleEnabled } from '../../lib/modules';
import type { TenantTier } from '@/shared/lib';
import { getPlatformPageFlags, type PlatformPageFlags } from '../flags/platform-flags';
import { canAccessPage, hasFeature, type TierLevel } from '../features/registry';
import { ROLE_PERMISSIONS, type Role } from '@/shared/lib';
import { MODULES, type ModuleKey } from '@/shared/lib';

import { db, tenants } from '@/shared/api/db';
import { getSessionAndRole } from '@/shared/api/auth-utils';
import { createComponentLogger } from '@/shared/lib';

const gateLogger = createComponentLogger('gate');

// ============================================
// PUBLIC TYPES
// ============================================

/**
 * Canonical 14-key feature namespace.
 * Sub-features use dot notation (e.g. 'maintenance.updates') in future phases.
 */
export type FeatureKey =
  | 'maintenance'
  | 'bookings'
  | 'events'
  | 'surveys'
  | 'competitions'
  | 'groups'
  | 'chat'
  | 'news'
  | 'directory'
  | 'resources'
  | 'conservation'
  | 'services'
  | 'dashboard'
  | 'messages';

/** Reasons the gate can return. `allowed` is the success case. */
export type GateReason = 'role' | 'tier' | 'module' | 'flag' | 'feature' | 'allowed';

/** Return type for canAccess() and canAccessClient(). */
export interface GateResult {
  allowed: boolean;
  reason: GateReason;
}

/**
 * Server-side gate context.
 */
export interface GateContext {
  tenantId: string;
  role: Role;
  tier: TenantTier;
}

// ============================================
// MAPPING TABLES (canonical source of truth)
// ============================================

export const FEATURE_TO_MODULE: Record<FeatureKey, ModuleKey | null> = {
  maintenance: 'maintenance',
  bookings: 'bookings',
  surveys: 'surveys',
  events: 'events',
  groups: 'groups',
  chat: 'chat',
  news: 'news',
  directory: 'directory',
  resources: 'resources',
  conservation: 'conservation',
  services: 'marketplace',
  messages: 'chat',
  competitions: null,
  dashboard: null,
};

type PlatformPageFlagKey = keyof PlatformPageFlags;

export const FEATURE_TO_FLAG: Record<FeatureKey, PlatformPageFlagKey | null> = {
  maintenance: 'maintenance',
  bookings: 'bookings',
  surveys: 'surveys',
  events: 'events',
  groups: 'groups',
  chat: 'chat',
  news: 'news',
  directory: 'directory',
  resources: 'resources',
  conservation: 'conservation',
  services: 'services',
  competitions: 'competitions',
  dashboard: 'dashboard',
  messages: 'messages',
};

export const FEATURE_TO_REGISTRY: Record<FeatureKey, string | null> = {
  maintenance: 'page.maintenance',
  bookings: 'page.bookings',
  surveys: 'page.surveys',
  events: 'page.events',
  groups: 'page.groups',
  chat: 'page.chat',
  news: 'page.news',
  directory: 'page.directory',
  resources: 'page.resources',
  conservation: 'page.conservation',
  services: 'page.marketplace',
  messages: 'page.chat',
  competitions: null,
  dashboard: null,
};

export const GATE_REASON_TO_ERROR: Record<GateReason, string> = {
  role: 'INSUFFICIENT_ROLE',
  tier: 'TIER_REQUIRED',
  module: 'MODULE_DISABLED',
  flag: 'PAGE_DISABLED',
  feature: 'FEATURE_UNAVAILABLE',
  allowed: 'OK',
};

// ============================================
// HELPERS
// ============================================

const TENANT_TIER_TO_LEVEL: Record<TenantTier, TierLevel> = {
  STANDARD: 'foundation',
  PREMIUM: 'depth',
  ENTERPRISE: 'core',
};

const TIER_LEVEL_ORDER: Record<TierLevel, number> = {
  foundation: 1,
  depth: 2,
  core: 3,
};

function tenantTierToTierLevel(tier: TenantTier): TierLevel {
  return TENANT_TIER_TO_LEVEL[tier] ?? 'foundation';
}

function tierAtLeast(tenant: TierLevel, required: TierLevel): boolean {
  return TIER_LEVEL_ORDER[tenant] >= TIER_LEVEL_ORDER[required];
}

const MODULES_REQUIRED_TIER: Record<ModuleKey, TierLevel> = Object.fromEntries(
  Object.entries(MODULES).map(([k, v]) => [k, v.tier])
) as Record<ModuleKey, TierLevel>;

function logDenial(ctx: GateContext, feature: FeatureKey, reason: GateReason): void {
  if (reason === 'allowed') return;
  gateLogger.info({
    event: 'gate.denied',
    tenantId: ctx.tenantId,
    feature,
    reason,
    role: ctx.role,
    tier: ctx.tier,
  });
}

// ============================================
// resolveGateContext
// ============================================

export async function resolveGateContext(
  tenantId: string,
  request?: Request
): Promise<GateContext> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  const authData = await getSessionAndRole(request);
  const role = (authData?.role as Role) ?? 'RESIDENT';

  return {
    tenantId,
    role,
    tier: tenant.tier,
  };
}

// ============================================
// canAccess — 5-layer precedence gate
// ============================================

export async function canAccess(
  ctx: GateContext,
  feature: FeatureKey,
  opts?: { skipFlag?: boolean }
): Promise<GateResult> {
  // Layer 0: Role (synchronous, in-memory)
  const rolePermissions = ROLE_PERMISSIONS[ctx.role];
  if (!rolePermissions) {
    logDenial(ctx, feature, 'role');
    return { allowed: false, reason: 'role' };
  }

  // Layer 1 & 2: Tier (in-memory) then Module (DB-backed)
  const moduleKey = FEATURE_TO_MODULE[feature];
  if (moduleKey !== null) {
    const tierLevel = tenantTierToTierLevel(ctx.tier);
    const requiredTier = MODULES_REQUIRED_TIER[moduleKey];
    if (!tierAtLeast(tierLevel, requiredTier)) {
      logDenial(ctx, feature, 'tier');
      return { allowed: false, reason: 'tier' };
    }

    const moduleOk = await isModuleEnabled(ctx.tenantId, moduleKey);
    if (!moduleOk) {
      logDenial(ctx, feature, 'module');
      return { allowed: false, reason: 'module' };
    }
  }

  // Layer 3: PageFlag (DB-backed, skippable via opts.skipFlag)
  if (!opts?.skipFlag) {
    const flagKey = FEATURE_TO_FLAG[feature];
    if (flagKey !== null) {
      const flags = await getPlatformPageFlags(ctx.tenantId);
      const flagValue = flags[flagKey];
      const flagOk = typeof flagValue === 'boolean' ? flagValue : true;
      if (!flagOk) {
        logDenial(ctx, feature, 'flag');
        return { allowed: false, reason: 'flag' };
      }
    }
  }

  // Layer 4: FeatureToggle (synchronous against FEATURE_REGISTRY)
  const registryKey = FEATURE_TO_REGISTRY[feature];
  if (registryKey !== null) {
    const tierLevel = tenantTierToTierLevel(ctx.tier);
    const pageKey = registryKey.replace(/^page\./, '');
    const featureOk = hasFeature(registryKey, tierLevel) && canAccessPage(pageKey, tierLevel);
    if (!featureOk) {
      logDenial(ctx, feature, 'feature');
      return { allowed: false, reason: 'feature' };
    }
  }

  return { allowed: true, reason: 'allowed' };
}
