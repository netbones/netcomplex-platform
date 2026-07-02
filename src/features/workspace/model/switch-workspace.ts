/**
 * switchWorkspace — Atomic Workspace Switching (C-01, D-07)
 *
 * 'use client' — composes useRouter, useWorkspaceSetContext, useDelegations,
 * resolveWorkspaceContext, and sonner toast.
 *
 * 5-step contract (UI-SPEC §'Atomic Workspace Switch', Pattern E):
 *   Step 0: Idempotency — if target === current, no-op
 *   Step 1: Resolve — resolveWorkspaceContext(target, delegations, session)
 *   Step 2: Atomic Replace — setCtx(nextCtx) (wholesale, single setState — C-01)
 *   Step 3: Navigate — router.push(href)
 *   Step 4: Render — implicit (React re-renders on setCtx)
 *   Step 5: Notify — toast.success(workspaceLabel)
 *
 * Rollback (P-03): on any resolve error, the prior context remains intact —
 *   setCtx is NEVER called before resolve succeeds.
 *
 * Threat T-122-09: Pino observability emits workspace.switch.attempt/success/failed
 *   with workspaceId + workspaceType + durationMs only. NEVER log permissions[]
 *   or delegator PII (grantedByName, propertyAddress).
 */

'use client';

import { useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from '@api/client';
import { useDelegations } from '@entities/delegation';
import type { WorkspaceTarget } from '@entities/workspace';
import { resolveWorkspaceContext, WorkspaceResolveError } from './resolve-workspace-context';
import { useWorkspaceContext, useWorkspaceSetContext } from './workspace-context';
import type { WorkspaceContext as WorkspaceContextType } from '@entities/workspace';

// ═══════════════════════════════════════════════════════════════
// Observability (T-122-09 — no PII, no permissions[])
// ═══════════════════════════════════════════════════════════════

/** Log-safe workspace descriptor — only workspaceId + type (no PII). */
function workspaceSwitchMetric(ctx: WorkspaceContextType): string {
  return `${ctx.workspaceType}:${ctx.workspaceId}`;
}

/** Derive the default navigation route from a resolved workspace context. */
function resolveDefaultHref(ctx: WorkspaceContextType): string | undefined {
  switch (ctx.workspaceType) {
    case 'PERSONAL':
      return '/dashboard';
    case 'PROPERTY':
      return ctx.scope?.propertyId ? `/properties/${ctx.scope.propertyId}` : '/dashboard';
    case 'PROVIDER':
      return '/provider';
    case 'OWNER':
      return '/owner';
    case 'AUTOMATION':
      return undefined; // D-11: disabled
    default:
      return undefined;
  }
}

/** Human-readable workspace label for toast (no PII). */
function workspaceLabel(ctx: WorkspaceContextType): string {
  switch (ctx.workspaceType) {
    case 'PERSONAL':
      return 'Your Account';
    case 'PROPERTY':
      return ctx.scope?.propertyId ?? 'Property';
    case 'PROVIDER':
      return 'Provider Workspace';
    case 'OWNER':
      return 'Owner Workspace';
    case 'AUTOMATION':
      return 'Automation';
    default:
      return ctx.workspaceType;
  }
}

// ═══════════════════════════════════════════════════════════════
// Switch Workspace Hook
// ═══════════════════════════════════════════════════════════════

export interface SwitchWorkspaceOptions {
  /** Optional href to navigate to after switch (overrides default inference). */
  href?: string;
}

export type SwitchWorkspaceFn = (
  target: WorkspaceTarget,
  options?: SwitchWorkspaceOptions
) => Promise<void>;

/**
 * useSwitchWorkspace — returns an async switchWorkspace() function.
 *
 * The returned function implements the 5-step atomic switch contract
 * (UI-SPEC §'Atomic Workspace Switch'). It is callable from arbitrary
 * callbacks outside the selector render tree (D-07 notification links).
 *
 * Uses useDelegations() to source RLS-gated delegation data (T-122-04/05).
 */
export function useSwitchWorkspace(): SwitchWorkspaceFn {
  const router = useRouter();
  const current = useWorkspaceContext();
  const setCtx = useWorkspaceSetContext();
  const { data: sessionData } = useSession();
  const { data: delegations } = useDelegations();

  return useCallback(
    async (target: WorkspaceTarget, options?: SwitchWorkspaceOptions) => {
      const href = options?.href;
      const startTime = performance.now();

      // ── Step 0: Idempotency (P-02) ───────────────────────
      // Compare workspaceId equivalence (not Object.is) since
      // the target may reference the same logical workspace
      // without being the same object reference.
      if (current) {
        const currentId = current.workspaceId;
        let targetId: string | undefined;
        switch (target.workspaceType) {
          case 'PERSONAL':
            targetId = `personal:${sessionData?.user?.id}`;
            break;
          case 'PROPERTY':
            if (target.propertyId) {
              targetId = `property:${target.propertyId}`;
            }
            break;
          // PROVIDER, OWNER — not yet resolvable in P1a
          default:
            break;
        }

        if (targetId && currentId === targetId) {
          // Idempotent: navigate if href provided, no context change, no toast
          if (href) router.push(href);
          return;
        }
      }

      // ── Step 1: Resolve (Pattern E verbatim) ─────────────
      let nextCtx: WorkspaceContextType;
      try {
        nextCtx = resolveWorkspaceContext(target, delegations ?? [], {
          user: { id: sessionData?.user?.id ?? 'unknown' },
        });
      } catch (err) {
        // T-122-09: observe failure — never log permissions[] or PII
        const durationMs = Math.round(performance.now() - startTime);
        if (typeof window !== 'undefined') {
          console.warn(
            `[workspace] switch failed ${durationMs}ms — ${target.workspaceType}:${err instanceof WorkspaceResolveError ? err.code : 'unknown'}`
          );
        }

        // Rollback: do NOT setCtx — prior context stays intact (P-03)
        if (err instanceof WorkspaceResolveError) {
          // UI-SPEC failure copy per error code
          const message =
            err.code === 'registry_miss'
              ? 'Workspace not found — it may have been removed.'
              : err.code === 'revoked' || err.code === 'expired'
                ? 'This delegation has been revoked or expired.'
                : 'Cannot access this workspace right now.';
          toast.error(message);
        }
        throw err;
      }

      // ── Step 2: Atomic Replace (C-01) ────────────────────
      setCtx?.(nextCtx);

      // ── Step 3: Navigate ────────────────────────────────
      // Derive default route from resolved context (C-02: resource-only URLs)
      const defaultHref = resolveDefaultHref(nextCtx);
      const targetHref = href ?? defaultHref;
      if (targetHref) {
        router.push(targetHref);
      }

      // ── Step 4: Render — implicit (React re-renders on setCtx)

      // ── Step 5: Notify (D-07) ─────────────────────────────
      toast.success(`Now viewing: ${workspaceLabel(nextCtx)}`);

      // T-122-09: observe success — workspaceId + type ONLY
      const durationMs = Math.round(performance.now() - startTime);
      if (typeof window !== 'undefined') {
        console.info(
          `[workspace] switch success ${durationMs}ms — from ${current ? workspaceSwitchMetric(current) : 'none'} → ${workspaceSwitchMetric(nextCtx)}`
        );
      }
    },
    [router, current, setCtx, sessionData, delegations]
  );
}
