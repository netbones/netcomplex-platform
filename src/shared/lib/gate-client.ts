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
 *   - When /api/flags is extended to return `tier`, useGateContext() will populate
 *     ctx.tier and Layer 4 will be active.
 *
 * The mapping tables (FEATURE_TO_FLAG, FEATURE_TO_REGISTRY) are re-imported from
 * src/shared/api/gate.ts. The client does NOT import FEATURE_TO_MODULE because the
 * Module layer is skipped on the client.
 */

'use client';

import type { FeatureKey, GateResult } from '@shared/api/gate';
import { FEATURE_TO_FLAG, FEATURE_TO_REGISTRY } from '@shared/api/gate';
import { type PlatformPageFlags } from '@entities/tenant/api/flags/platform-flags';
import { canAccessPage, hasFeature, type TierLevel } from '@entities/tenant/api/features/registry';
import { ROLE_PERMISSIONS, type Role } from '@entities/tenant/api/permissions';

import { useSession } from '@shared/api/auth-client';
import { usePageFlags } from './hooks/usePageFlags';

// ============================================
// CONTEXT
// ============================================

/**
 * Client-side gate context.
 *
 * `tier` is OPTIONAL. /api/flags does not currently return it (Phase 1 decision,
 * Q1=A). When present, the FeatureToggle layer (Layer 4) uses it. When absent,
 * Layer 4 is permissive (returns true) — the server will still 403 if the
 * actual tier is insufficient.
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
 *
 * Role is read from the real Better Auth session via useSession(). The role is
 * on `session.user.role` (set via additionalFields in src/shared/api/auth.ts).
 * Falls back to 'RESIDENT' for unauthenticated requests.
 */
export function useGateContext(): ClientGateContext | null {
  const { flags, isLoading, error } = usePageFlags();
  const { data: session } = useSession();

  // Both session and flags are required. If either is loading/erroring, return null.
  if (isLoading || error || !flags) {
    return null;
  }

  // Defensive cast: Better Auth's TypeScript types may not include the
  // additionalFields `role` augmentation in every code path. The additionalFields
  // is configured in src/shared/api/auth.ts and is authoritative at runtime.
  const role = (session?.user as { role?: string } | undefined)?.role as Role | undefined;
  const resolvedRole: Role = role ?? 'RESIDENT';

  return {
    role: resolvedRole,
    flags,
    // tier: undefined (not fetched from /api/flags in Phase 1)
  };
}

// ============================================
// canAccessClient — sync, 3 layers only
// ============================================

/**
 * Evaluate a feature gate against the resolved client context.
 *
 * Skips Layer 1 (Tier) and Layer 2 (Module) — those are server-only. Server
 * is the source of truth for those layers; client renders null/upgrade prompt
 * based on what server allows.
 *
 * @param ctx       Resolved client gate context (use useGateContext() to build this)
 * @param feature   The canonical FeatureKey being checked
 * @param opts      Optional flags — `skipFlag: true` skips the PageFlag layer
 *                  (used by callers that have already fetched flags)
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

  // Layer 1: Tier — SKIPPED on client
  // Server is source of truth; client doesn't fetch tenant.tier from /api/flags

  // Layer 2: Module — SKIPPED on client
  // Server is source of truth; server returns 403 on module-disabled API calls

  // Layer 3: PageFlag
  if (!opts?.skipFlag) {
    const flagKey = (FEATURE_TO_FLAG as Record<FeatureKey, string | null>)[feature];
    if (flagKey !== null) {
      const flagValue = ctx.flags[flagKey as keyof PlatformPageFlags];
      // Tri-state flags (e.g. 'conservation': 'default' | 'managed' | 'external')
      // are always enabled at the gate layer; the UI consumes the value to decide
      // rendering. Boolean flags use their value directly. Matches the server's
      // behavior in src/shared/api/gate.ts (Phase 1 invariant).
      const flagOk = typeof flagValue === 'boolean' ? flagValue : true;
      if (!flagOk) {
        return { allowed: false, reason: 'flag' };
      }
    }
  }

  // Layer 4: FeatureToggle (only if tier is available in context)
  const registryKey = (FEATURE_TO_REGISTRY as Record<FeatureKey, string | null>)[feature];
  if (registryKey !== null && ctx.tier) {
    const featureOk =
      hasFeature(registryKey, ctx.tier) && canAccessPage(registryKey.replace(/^page\./, ''), ctx.tier);
    if (!featureOk) {
      return { allowed: false, reason: 'feature' };
    }
  }
  // If ctx.tier is not present, Layer 4 is permissive (returns true).
  // This is the Phase 1 trade-off: client doesn't fetch tier; if the page flag
  // is on (Layer 3), client renders. Server will still 403 if tier is wrong.

  return { allowed: true, reason: 'allowed' };
}

// ============================================
// useCanAccess — reactive hook
// ============================================

/**
 * Reactive hook combining useGateContext() + canAccessClient().
 *
 * Returns a conservative `{ allowed: false, reason: 'role' }` while the context
 * is still loading. This is the "deny by default while loading" trade-off
 * (decision 2026-06-01) — safer than optimistically rendering gated content
 * that the server might 403.
 */
export function useCanAccess(feature: FeatureKey, opts?: { skipFlag?: boolean }): GateResult {
  const ctx = useGateContext();
  if (!ctx) {
    // Conservative default while context is loading
    return { allowed: false, reason: 'role' };
  }
  return canAccessClient(ctx, feature, opts);
}
