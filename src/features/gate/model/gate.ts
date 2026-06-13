/**
 * Feature Gate — client-side entry point.
 *
 * Public API (mirrors the server canAccess() shape but for client components):
 *   - canAccessClient(ctx, feature, opts?) — sync, layers 0/3/4 only
 *   - useGateContext() — resolves { role, flags } from Better Auth session + /api/flags
 *   - useCanAccess(feature, opts?) — reactive GateResult
 *   - ClientGateContext — client resolution shape
 *
 * Server/client asymmetry (per Q1=A locked decision):
 *   - The CLIENT evaluates only 3 layers: Role (0), PageFlag (3), FeatureToggle (4).
 *   - The CLIENT skips Tier (1) and Module (2) — those are server-only.
 *   - The SERVER is the source of truth; the client is "best effort".
 */

'use client';

import type { FeatureKey, GateResult } from '@entities/tenant';
import { FEATURE_TO_FLAG, FEATURE_TO_REGISTRY } from '@entities/tenant';
import { type PlatformPageFlags } from '@shared/lib';
import { canAccessPage, hasFeature, type TierLevel } from '@entities/tenant';
import { ROLE_PERMISSIONS, type Role } from '@shared/lib';

import { useSession } from '@api/client';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';

// ============================================
// CONTEXT
// ============================================

/**
 * Client-side gate context.
 *
 * `tier` is OPTIONAL. /api/flags does not currently return it.
 * When present, the FeatureToggle layer (Layer 4) uses it.
 * When absent, Layer 4 is permissive (returns true).
 */
export interface ClientGateContext {
  role: Role;
  flags: PlatformPageFlags;
  /** Optional tier (TierLevel) — when present, enables Layer 4 client-side. */
  tier?: TierLevel;
}

// ============================================
// useGateContext
// ============================================

/**
 * Resolve the client gate context from Better Auth session + /api/flags.
 *
 * Returns `null` while session or flags are still loading.
 */
export function useGateContext(): ClientGateContext | null {
  const { flags, isLoading, error } = usePageFlags();
  const { data: session } = useSession();

  if (isLoading || error || !flags) {
    return null;
  }

  const role = (session?.user as { role?: string } | undefined)?.role as Role | undefined;
  const resolvedRole: Role = role ?? 'RESIDENT';

  return {
    role: resolvedRole,
    flags,
  };
}

// ============================================
// canAccessClient — sync, 3 layers only
// ============================================

/**
 * Evaluate a feature gate against the resolved client context.
 *
 * Skips Layer 1 (Tier) and Layer 2 (Module) — those are server-only.
 *
 * @param ctx       Resolved client gate context
 * @param feature   The canonical FeatureKey being checked
 * @param opts      Optional flags — `skipFlag: true` skips the PageFlag layer
 */
export function canAccessClient(
  ctx: ClientGateContext,
  feature: FeatureKey,
  opts?: { skipFlag?: boolean }
): GateResult {
  // Layer 0: Role (synchronous, in-memory)
  const rolePermissions = ROLE_PERMISSIONS[ctx.role];
  if (!rolePermissions) {
    return { allowed: false, reason: 'role' };
  }

  // Layer 3: PageFlag
  if (!opts?.skipFlag) {
    const flagKey = (FEATURE_TO_FLAG as Record<FeatureKey, string | null>)[feature];
    if (flagKey !== null) {
      const flagValue = ctx.flags[flagKey as keyof PlatformPageFlags];
      const flagOk = typeof flagValue === 'boolean' ? flagValue : true;
      if (!flagOk) {
        return { allowed: false, reason: 'flag' };
      }
    }
  }

  // Layer 4: FeatureToggle (only if tier is available in context)
  const registryKey = (FEATURE_TO_REGISTRY as Record<FeatureKey, string | null>)[feature];
  if (registryKey !== null && ctx.tier) {
    const pageKey = registryKey.replace(/^page\./, '');
    const featureOk = hasFeature(registryKey, ctx.tier) && canAccessPage(pageKey, ctx.tier);
    if (!featureOk) {
      return { allowed: false, reason: 'feature' };
    }
  }

  return { allowed: true, reason: 'allowed' };
}

// ============================================
// useCanAccess — reactive hook
// ============================================

/**
 * Reactive hook combining useGateContext() + canAccessClient().
 */
export function useCanAccess(feature: FeatureKey, opts?: { skipFlag?: boolean }): GateResult {
  const ctx = useGateContext();
  if (!ctx) {
    return { allowed: false, reason: 'role' };
  }
  return canAccessClient(ctx, feature, opts);
}
