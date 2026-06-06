'use client';

import type { ReactNode } from 'react';
import type { FeatureKey, GateResult } from '@shared/api';
import { useGateContext, canAccessClient } from '@shared/lib-client';

// ============================================
// GateGuard — client component wrapper
// ============================================

/**
 * Props for the GateGuard component.
 *
 * GateGuard is a thin client wrapper around canAccessClient(). It does NOT add
 * new gate logic — it simply renders children, fallback, or a render-prop result
 * based on the gate decision.
 */
interface GateGuardProps {
  /** Feature key (canonical FeatureKey, not legacy 'page.*' string) */
  feature: FeatureKey;
  /** Content to render when access is allowed */
  children: ReactNode;
  /** Fallback content when access is denied (default: null) */
  fallback?: ReactNode;
  /**
   * Render prop: receives the full GateResult, returns custom UI.
   * Use this when the UI should differ by reason (e.g. upgrade prompt for
   * 'tier', null for 'flag', loading skeleton for 'role' while pending).
   * Takes precedence over `fallback` when supplied.
   */
  render?: (props: { result: GateResult }) => ReactNode;
  /** Skip the PageFlag layer (useful for admin pages that always render) */
  skipFlag?: boolean;
  /**
   * Show this fallback while the gate context is still loading
   * (default: null — invisible during load).
   * Most uses should leave this as null to avoid layout shift.
   */
  loadingFallback?: ReactNode;
}

/**
 * Conditionally render children based on the client-side feature gate.
 *
 * Decision order:
 *   1. If context is loading (null): render `loadingFallback` (default null)
 *   2. If `render` prop is provided: call it with the result (always rendered)
 *   3. If access is allowed: render `children`
 *   4. Otherwise: render `fallback` (default null)
 *
 * The pure function `canAccessClient` does the gate work; this component is the
 * React rendering layer. Migration target for `TierGuard` (Phase 2).
 *
 * @example Hide a feature for non-admins
 * ```tsx
 * <GateGuard feature="settings" fallback={null}>
 *   <AdminSettingsLink />
 * </GateGuard>
 * ```
 *
 * @example Custom UI per reason
 * ```tsx
 * <GateGuard
 *   feature="services"
 *   render={({ result }) =>
 *     result.allowed ? <Marketplace /> : <UpgradePrompt reason={result.reason} />
 *   }
 * />
 * ```
 */
export function GateGuard({
  feature,
  children,
  fallback = null,
  render,
  skipFlag,
  loadingFallback = null,
}: GateGuardProps) {
  const ctx = useGateContext();

  // Context still loading (session or /api/flags not yet resolved)
  if (!ctx) {
    return <>{loadingFallback}</>;
  }

  const result = canAccessClient(ctx, feature, { skipFlag });

  // Render prop (most specific — takes precedence over children/fallback)
  if (render) {
    return <>{render({ result })}</>;
  }

  // Boolean conditional
  if (result.allowed) {
    return <>{children}</>;
  }

  // Fallback (typically null to hide)
  return <>{fallback}</>;
}

export default GateGuard;

// ============================================
// useGateResult — hook for components that want the raw result
// ============================================

/**
 * Reactive hook returning the gate decision directly (no rendering).
 * Use this when the consuming component needs the full `GateResult` object
 * (e.g., to switch on `result.reason`).
 *
 * Returns `null` while the gate context is loading.
 */
export function useGateResult(
  feature: FeatureKey,
  opts?: { skipFlag?: boolean }
): GateResult | null {
  const ctx = useGateContext();
  if (!ctx) return null;
  return canAccessClient(ctx, feature, opts);
}
