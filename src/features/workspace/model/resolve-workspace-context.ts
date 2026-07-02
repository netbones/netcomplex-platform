/**
 * Workspace Context Resolver — Pure Function (Pattern G)
 *
 * NOT 'use client' — no React, no hooks. Pure function testable in isolation.
 * Resolves a WorkspaceTarget + DelegationListItem[] + session → WorkspaceContext.
 *
 * Design constraints:
 *   - C-01: output is immutable — callers atomically replace, never mutate
 *   - C-03: lightweight — only scope pointer + permissions, no domain data
 *   - T-122-05: PROPERTY permissions come EXCLUSIVELY from delegation.permissions
 *                (server-authoritative via RLS-gated /api/delegations)
 *   - D-03: PROVIDER/OWNER throw not_implemented (deferred to P2)
 *   - D-11: AUTOMATION throws forbidden (disabled until Phase 113+)
 */

import type { WorkspaceContext, WorkspaceTarget } from '@entities/workspace';
import type { DelegationListItem } from '@entities/delegation';
import type { Permission } from '@entities/workspace';

// ═══════════════════════════════════════════════════════════════
// Error Class
// ═══════════════════════════════════════════════════════════════

/**
 * Typed resolve error thrown by resolveWorkspaceContext().
 *
 * Consumers (switchWorkspace in P1a-03) use `err instanceof WorkspaceResolveError`
 * and inspect `err.code` to generate the correct toast message (UI-SPEC error copy).
 */
export class WorkspaceResolveError extends Error {
  public readonly code: 'registry_miss' | 'revoked' | 'expired' | 'not_implemented' | 'forbidden';

  constructor(code: 'registry_miss' | 'revoked' | 'expired' | 'not_implemented' | 'forbidden') {
    super(code);
    this.name = 'WorkspaceResolveError';
    this.code = code;
  }
}

// ═══════════════════════════════════════════════════════════════
// Resolver
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve a WorkspaceTarget into a WorkspaceContext.
 *
 * Pure function — no React, no hooks, no side effects. Callable from anywhere.
 *
 * @param target       The workspace to resolve into
 * @param delegations  Current user's delegations (from useDelegations())
 * @param session      The Better Auth session (minimum: { user: { id } })
 * @returns            The resolved WorkspaceContext
 * @throws WorkspaceResolveError on any unresolvable target
 */
export function resolveWorkspaceContext(
  target: WorkspaceTarget,
  delegations: DelegationListItem[],
  session: { user: { id: string } }
): WorkspaceContext {
  switch (target.workspaceType) {
    // ── PERSONAL ────────────────────────────────────────────
    case 'PERSONAL':
      return {
        workspaceId: `personal:${session.user.id}`,
        workspaceType: 'PERSONAL',
        permissions: ['profile:read', 'settings:manage'] as Permission[],
      };

    // ── PROPERTY ────────────────────────────────────────────
    case 'PROPERTY': {
      const delegation = delegations.find(d => d.id === target.delegationId);

      if (!delegation) {
        throw new WorkspaceResolveError('registry_miss');
      }

      if (delegation.status !== 'ACTIVE') {
        throw new WorkspaceResolveError('revoked');
      }

      if (new Date(delegation.expiresAt) < new Date()) {
        throw new WorkspaceResolveError('revoked');
      }

      return {
        workspaceId: `property:${delegation.propertyId}`,
        workspaceType: 'PROPERTY',
        scope: { propertyId: delegation.propertyId },
        // T-122-05: permissions are server-authoritative from delegation
        permissions: delegation.permissions as Permission[],
      };
    }

    // ── PROVIDER / OWNER (D-03: deferred to P2) ──────────────
    case 'PROVIDER':
    case 'OWNER':
      throw new WorkspaceResolveError('not_implemented');

    // ── AUTOMATION (D-11: disabled) ──────────────────────────
    case 'AUTOMATION':
      throw new WorkspaceResolveError('forbidden');

    // ── Exhaustiveness ───────────────────────────────────────
    default: {
      const _exhaustive: never = target.workspaceType;
      throw new WorkspaceResolveError('not_implemented');
    }
  }
}
