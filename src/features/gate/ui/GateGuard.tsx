'use client';

import type { ReactNode } from 'react';
import type { FeatureKey, GateResult } from '@entities/tenant/server';
import { useGateContext, canAccessClient } from '../model/gate';

// ============================================
// GateGuard — client component wrapper
// ============================================

/**
 * Props for the GateGuard component.
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
   */
  render?: (props: { result: GateResult }) => ReactNode;
  /** Skip the PageFlag layer (useful for admin pages that always render) */
  skipFlag?: boolean;
  /**
   * Show this fallback while the gate context is still loading
   */
  loadingFallback?: ReactNode;
}

/**
 * Conditionally render children based on the client-side feature gate.
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
 */
export function useGateResult(
  feature: FeatureKey,
  opts?: { skipFlag?: boolean }
): GateResult | null {
  const ctx = useGateContext();
  if (!ctx) return null;
  return canAccessClient(ctx, feature, opts);
}
