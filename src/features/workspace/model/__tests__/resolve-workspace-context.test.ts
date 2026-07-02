/**
 * resolveWorkspaceContext — Unit Tests (RED phase)
 *
 * Validates the pure resolver against all branches from the plan:
 *   P-05 lightweight guard (no domain PII in serialized context),
 *   PERSONAL from session, PROPERTY with delegation,
 *   registry_miss, revoked (REVOKED status + expired), not_implemented,
 *   forbidden.
 */

import { describe, it, expect } from 'vitest';
import type { DelegationListItem } from '@entities/delegation';
import { resolveWorkspaceContext, WorkspaceResolveError } from '../resolve-workspace-context';

// ═══════════════════════════════════════════════════════════════
// Typed builders (Pattern G + Pattern K — NO as any)
// ═══════════════════════════════════════════════════════════════

function activeDelegation(o: Partial<DelegationListItem> = {}): DelegationListItem {
  return {
    id: 'd1',
    propertyId: 'p1',
    propertyAddress: '14 Palm Avenue',
    agentId: 'a1',
    agentName: 'Agent Smith',
    agentEmail: 'smith@agent.com',
    grantedById: 'o1',
    grantedByName: 'Owner Owens',
    permissions: ['maintenance:read', 'maintenance:create'],
    status: 'ACTIVE',
    startedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2027-01-01T00:00:00.000Z',
    acceptedAt: '2026-01-01T00:00:00.000Z',
    rejectedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...o,
  };
}

type SessionStub = { user: { id: string } };

function sessionStub(id = 'u1'): SessionStub {
  return { user: { id } };
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('resolveWorkspaceContext', () => {
  // ── PERSONAL ────────────────────────────────────────────────

  describe('PERSONAL target', () => {
    it('builds from session alone (no delegations)', () => {
      const ctx = resolveWorkspaceContext(
        { workspaceType: 'PERSONAL' },
        [],
        sessionStub('alice-42')
      );

      expect(ctx.workspaceType).toBe('PERSONAL');
      expect(ctx.workspaceId).toBe('personal:alice-42');
      expect(ctx.scope).toBeUndefined();
      expect(ctx.permissions).toEqual(['profile:read', 'settings:manage']);
    });

    it('ignores passed delegations — always session-derived', () => {
      const ctx = resolveWorkspaceContext(
        { workspaceType: 'PERSONAL' },
        [activeDelegation()],
        sessionStub('u99')
      );

      expect(ctx.workspaceType).toBe('PERSONAL');
      expect(ctx.workspaceId).toBe('personal:u99');
    });

    // P-05 lightweight guard: serialized context has no domain PII keys
    it('P-05: serialized context has no domain data keys (lightweight guard)', () => {
      const ctx = resolveWorkspaceContext({ workspaceType: 'PERSONAL' }, [], sessionStub('u1'));

      const serialized = JSON.stringify(ctx);
      const parsed = JSON.parse(serialized) as Record<string, unknown>;

      // Verify only the 4 allowed top-level keys (C-03)
      const keys = Object.keys(parsed);
      expect(keys).toContain('workspaceId');
      expect(keys).toContain('workspaceType');
      expect(keys).toContain('permissions');
      // scope may be present or undefined — either is fine for PERSONAL

      // No domain data keys (tasks, messages, maintenance, billing are forbidden)
      expect(keys).not.toContain('tasks');
      expect(keys).not.toContain('messages');
      expect(keys).not.toContain('maintenance');
      expect(keys).not.toContain('billing');
    });
  });

  // ── PROPERTY ────────────────────────────────────────────────

  describe('PROPERTY target', () => {
    it('builds from a matching ACTIVE delegation', () => {
      const ctx = resolveWorkspaceContext(
        { workspaceType: 'PROPERTY', delegationId: 'd1' },
        [activeDelegation()],
        sessionStub()
      );

      expect(ctx.workspaceId).toBe('property:p1');
      expect(ctx.workspaceType).toBe('PROPERTY');
      expect(ctx.scope).toEqual({ propertyId: 'p1' });
      expect(ctx.permissions).toEqual(['maintenance:read', 'maintenance:create']);
    });

    it('throws registry_miss when delegationId not found', () => {
      expect(() =>
        resolveWorkspaceContext(
          { workspaceType: 'PROPERTY', delegationId: 'no-such-id' },
          [],
          sessionStub()
        )
      ).toThrow(WorkspaceResolveError);

      try {
        resolveWorkspaceContext(
          { workspaceType: 'PROPERTY', delegationId: 'no-such-id' },
          [],
          sessionStub()
        );
      } catch (err) {
        expect(err).toBeInstanceOf(WorkspaceResolveError);
        expect((err as WorkspaceResolveError).code).toBe('registry_miss');
      }
    });

    it('throws revoked when delegation status is REVOKED', () => {
      expect(() =>
        resolveWorkspaceContext(
          { workspaceType: 'PROPERTY', delegationId: 'd1' },
          [activeDelegation({ status: 'REVOKED' })],
          sessionStub()
        )
      ).toThrow(WorkspaceResolveError);

      try {
        resolveWorkspaceContext(
          { workspaceType: 'PROPERTY', delegationId: 'd1' },
          [activeDelegation({ status: 'REVOKED' })],
          sessionStub()
        );
      } catch (err) {
        expect(err).toBeInstanceOf(WorkspaceResolveError);
        expect((err as WorkspaceResolveError).code).toBe('revoked');
      }
    });

    it('throws revoked when delegation status is EXPIRED', () => {
      expect(() =>
        resolveWorkspaceContext(
          { workspaceType: 'PROPERTY', delegationId: 'd1' },
          [activeDelegation({ status: 'EXPIRED' })],
          sessionStub()
        )
      ).toThrow(WorkspaceResolveError);

      try {
        resolveWorkspaceContext(
          { workspaceType: 'PROPERTY', delegationId: 'd1' },
          [activeDelegation({ status: 'EXPIRED' })],
          sessionStub()
        );
      } catch (err) {
        expect(err).toBeInstanceOf(WorkspaceResolveError);
        expect((err as WorkspaceResolveError).code).toBe('revoked');
      }
    });

    it('throws revoked when expiresAt is in the past', () => {
      expect(() =>
        resolveWorkspaceContext(
          { workspaceType: 'PROPERTY', delegationId: 'd1' },
          [activeDelegation({ expiresAt: '2020-01-01T00:00:00.000Z' })],
          sessionStub()
        )
      ).toThrow(WorkspaceResolveError);

      try {
        resolveWorkspaceContext(
          { workspaceType: 'PROPERTY', delegationId: 'd1' },
          [activeDelegation({ expiresAt: '2020-01-01T00:00:00.000Z' })],
          sessionStub()
        );
      } catch (err) {
        expect(err).toBeInstanceOf(WorkspaceResolveError);
        expect((err as WorkspaceResolveError).code).toBe('revoked');
      }
    });

    it('throws revoked for PENDING status (not yet active)', () => {
      expect(() =>
        resolveWorkspaceContext(
          { workspaceType: 'PROPERTY', delegationId: 'd1' },
          [activeDelegation({ status: 'PENDING' })],
          sessionStub()
        )
      ).toThrow(WorkspaceResolveError);

      try {
        resolveWorkspaceContext(
          { workspaceType: 'PROPERTY', delegationId: 'd1' },
          [activeDelegation({ status: 'PENDING' })],
          sessionStub()
        );
      } catch (err) {
        expect(err).toBeInstanceOf(WorkspaceResolveError);
        expect((err as WorkspaceResolveError).code).toBe('revoked');
      }
    });
  });

  // ── PROVIDER / OWNER / AUTOMATION ───────────────────────────

  describe('deferred workspace types', () => {
    it('throws not_implemented for PROVIDER target (D-03, P2 deferral)', () => {
      expect(() =>
        resolveWorkspaceContext({ workspaceType: 'PROVIDER' }, [], sessionStub())
      ).toThrow(WorkspaceResolveError);

      try {
        resolveWorkspaceContext({ workspaceType: 'PROVIDER' }, [], sessionStub());
      } catch (err) {
        expect(err).toBeInstanceOf(WorkspaceResolveError);
        expect((err as WorkspaceResolveError).code).toBe('not_implemented');
      }
    });

    it('throws not_implemented for OWNER target (D-03, P2 deferral)', () => {
      try {
        resolveWorkspaceContext({ workspaceType: 'OWNER' }, [], sessionStub());
      } catch (err) {
        expect(err).toBeInstanceOf(WorkspaceResolveError);
        expect((err as WorkspaceResolveError).code).toBe('not_implemented');
      }
    });

    it('throws forbidden for AUTOMATION target (D-11)', () => {
      try {
        resolveWorkspaceContext({ workspaceType: 'AUTOMATION' }, [], sessionStub());
      } catch (err) {
        expect(err).toBeInstanceOf(WorkspaceResolveError);
        expect((err as WorkspaceResolveError).code).toBe('forbidden');
      }
    });
  });
});
