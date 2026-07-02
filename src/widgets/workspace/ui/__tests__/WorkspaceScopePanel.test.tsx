/**
 * WorkspaceScopePanel — Parametrized Unit Tests (RED phase)
 *
 * Validates the first-class workspace object (D-13): scope line, delegator,
 * permissions, expiry — parametrized across PERSONAL/PROVIDER/PROPERTY/OWNER.
 * Plus AUTOMATION-never-renders (D-11), missing-field behaviour, and PII guard.
 *
 * RED: Stub returns null → ALL assertions FAIL on first run.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { WorkspaceContext, WorkspaceType } from '@entities/workspace';
import type { DelegationListItem } from '@entities/delegation';
import { logger } from '@shared/lib';

// ═══════════════════════════════════════════════════════════════
// Mock modules BEFORE importing the component under test
// ═══════════════════════════════════════════════════════════════

const mockUseWorkspaceContext = vi.fn();
const mockUseDelegations = vi.fn();
const mockUseSession = vi.fn();

vi.mock('@features/workspace', () => ({
  useWorkspaceContext: () => mockUseWorkspaceContext(),
}));

vi.mock('@entities/delegation', () => ({
  useDelegations: (params?: { propertyId?: string; status?: string }) => mockUseDelegations(params),
  SCOPE_LABELS: {
    'profile:read': 'read profile',
    'settings:manage': 'manage own settings',
    'maintenance:read': 'View maintenance requests',
    'maintenance:create': 'Raise maintenance requests',
    'maintenance:coordinate': 'Coordinate with occupants on maintenance',
    'maintenance:manage': 'Manage maintenance (assign, close)',
    'maintenance:approve': 'Approve maintenance costs',
    'tenancy:manage': 'Manage tenancy & renewals',
    'documents:read': 'View property documents',
    'documents:upload': 'Upload property documents',
    'communication:contact_occupant': 'Message occupants directly',
    'financials:read': 'View financial records',
    'listing:manage': 'Edit listing details',
    'inspection:schedule': 'Schedule inspections',
  },
}));

vi.mock('@api/client', () => ({
  useSession: () => mockUseSession(),
}));

// ═══════════════════════════════════════════════════════════════
// Lazy import — mocks must be registered first
// ═══════════════════════════════════════════════════════════════

import { WorkspaceScopePanel } from '../WorkspaceScopePanel';

// ═══════════════════════════════════════════════════════════════
// Helpers — typed mock builders (NO `as any`)
// ═══════════════════════════════════════════════════════════════

/** Build a typed WorkspaceContext for a given type. */
function makeContext(
  type: WorkspaceType,
  overrides: Partial<Omit<WorkspaceContext, 'workspaceType'>> = {}
): WorkspaceContext {
  const defaults: Record<WorkspaceType, WorkspaceContext> = {
    PERSONAL: {
      workspaceId: 'ws-personal-1',
      workspaceType: 'PERSONAL',
      permissions: ['profile:read', 'settings:manage'] as WorkspaceContext['permissions'],
    },
    PROVIDER: {
      workspaceId: 'ws-provider-1',
      workspaceType: 'PROVIDER',
      scope: { providerId: 'prov-abc' },
      permissions: [
        'maintenance:coordinate',
        'maintenance:manage',
        'communication:contact_occupant',
        'documents:read',
      ] as WorkspaceContext['permissions'],
    },
    PROPERTY: {
      workspaceId: 'ws-property-1',
      workspaceType: 'PROPERTY',
      scope: { propertyId: 'prop-14-palm' },
      permissions: [
        'maintenance:read',
        'maintenance:create',
        'documents:read',
      ] as WorkspaceContext['permissions'],
    },
    OWNER: {
      workspaceId: 'ws-owner-1',
      workspaceType: 'OWNER',
      scope: { ownerId: 'own-1' },
      permissions: [
        'maintenance:approve',
        'tenancy:manage',
        'financials:read',
      ] as WorkspaceContext['permissions'],
    },
    AUTOMATION: {
      workspaceId: 'ws-auto-1',
      workspaceType: 'AUTOMATION',
      permissions: [] as WorkspaceContext['permissions'],
    },
  };

  return { ...defaults[type], ...overrides };
}

/** Build a typed DelegationListItem for PROPERTY delegation lookup. */
function activeDelegation(overrides: Partial<DelegationListItem> = {}): DelegationListItem {
  return {
    id: 'd1',
    propertyId: 'prop-14-palm',
    propertyAddress: '14 Palm Avenue',
    agentId: 'a1',
    agentName: 'Agent Smith',
    agentEmail: 'smith@agent.com',
    grantedById: 'o1',
    grantedByName: 'Owner Owens',
    permissions: ['maintenance:read', 'maintenance:create', 'documents:read'],
    status: 'ACTIVE',
    startedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2027-06-15T00:00:00.000Z',
    acceptedAt: '2026-01-01T00:00:00.000Z',
    rejectedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Build mock session data with a user. */
function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      user: {
        id: 'user-1',
        name: 'Alex Resident',
        email: 'alex@village.local',
        image: null,
        ...(overrides as Record<string, unknown>),
      },
    },
    isPending: false,
    error: null,
  };
}

// ═══════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════

describe('WorkspaceScopePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no workspace context (resolving/loading state)
    mockUseWorkspaceContext.mockReturnValue(null);
    mockUseDelegations.mockReturnValue({ data: undefined, isLoading: false });
    mockUseSession.mockReturnValue({ data: undefined, isPending: true, error: null });
  });

  // ── Loading / Null State ──────────────────────────────────

  it('renders loading skeleton when workspace context is null (resolving)', () => {
    mockUseWorkspaceContext.mockReturnValue(null);
    render(<WorkspaceScopePanel />);
    // GREEN renders LoadingSkeleton (role="status" aria-label="Loading")
    expect(screen.getByRole('status', { name: 'Loading' })).toBeDefined();
  });

  // ── AUTOMATION never renders (D-11) ───────────────────────

  it('returns null for AUTOMATION workspace type (D-11)', () => {
    mockUseWorkspaceContext.mockReturnValue(makeContext('AUTOMATION'));
    mockUseSession.mockReturnValue(makeSession());
    const { container } = render(<WorkspaceScopePanel />);
    // Stub returns null regardless → passes even RED; GREEN must explicitly guard
    expect(container.firstChild).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════
  // PARAMETRIZED: PERSONAL / PROVIDER / PROPERTY / OWNER
  // ═══════════════════════════════════════════════════════════

  describe.each([
    {
      type: 'PERSONAL' as WorkspaceType,
      label: 'Personal',
      displayName: 'Alex Resident',
      permsText: 'read profile, manage own settings',
      hasDelegatedBy: false,
      hasScopeLine: false,
      expiresText: 'Never',
    },
    {
      type: 'PROVIDER' as WorkspaceType,
      label: 'Provider',
      displayName: 'Unnamed workspace',
      permsText:
        'Coordinate with occupants on maintenance, Manage maintenance (assign, close), Message occupants directly, View property documents',
      hasDelegatedBy: false,
      hasScopeLine: true,
      expiresText: 'Never',
    },
    {
      type: 'PROPERTY' as WorkspaceType,
      label: 'Property',
      displayName: '14 Palm Avenue',
      permsText: 'View maintenance requests, Raise maintenance requests, View property documents',
      hasDelegatedBy: true,
      hasScopeLine: true,
      expiresText: '6/15/2027',
    },
    {
      type: 'OWNER' as WorkspaceType,
      label: 'Owner',
      displayName: 'Unnamed workspace',
      permsText: 'Approve maintenance costs, Manage tenancy & renewals, View financial records',
      hasDelegatedBy: false,
      hasScopeLine: true,
      expiresText: 'Never',
    },
  ])(
    'renders $type workspace scope panel',
    ({ type, label, displayName, permsText, hasDelegatedBy, hasScopeLine, expiresText }) => {
      beforeEach(() => {
        mockUseWorkspaceContext.mockReturnValue(makeContext(type));
        mockUseSession.mockReturnValue(makeSession());

        if (type === 'PROPERTY') {
          mockUseDelegations.mockReturnValue({
            data: [activeDelegation()],
            isLoading: false,
          });
        } else {
          mockUseDelegations.mockReturnValue({ data: undefined, isLoading: false });
        }
      });

      it('shows "Current Workspace" title', () => {
        render(<WorkspaceScopePanel />);
        const el = screen.queryByText('Current Workspace');
        // Stub returns null → this WILL FAIL (expected in RED phase)
        expect(el).not.toBeNull();
      });

      it(`shows type label "${label}"`, () => {
        render(<WorkspaceScopePanel />);
        const el = screen.queryByText(new RegExp(label));
        expect(el).not.toBeNull();
      });

      it(`shows display name "${displayName}"`, () => {
        render(<WorkspaceScopePanel />);
        const el = screen.queryByText(displayName);
        expect(el).not.toBeNull();
      });

      it(`shows permissions "${permsText}"`, () => {
        render(<WorkspaceScopePanel />);
        // Use regex for substring match (RTL exact-string default requires full text match)
        for (const part of permsText.split(', ')) {
          const el = screen.queryByText(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
          expect(el).not.toBeNull();
        }
      });

      it(`shows "Expires: ${expiresText}"`, () => {
        render(<WorkspaceScopePanel />);
        const el = screen.queryByText(
          new RegExp(`Expires:\\s*${expiresText.replace(/[/]/g, '\\/')}`)
        );
        expect(el).not.toBeNull();
      });

      if (hasDelegatedBy) {
        it('shows "Delegated by" line (Provider/Property only)', () => {
          render(<WorkspaceScopePanel />);
          const el = screen.queryByText(/Delegated by/);
          expect(el).not.toBeNull();
        });
      } else {
        it('does NOT show "Delegated by" line', () => {
          render(<WorkspaceScopePanel />);
          const el = screen.queryByText(/Delegated by/);
          expect(el).toBeNull();
        });
      }

      if (!hasScopeLine) {
        it('hides scope line when scope unset (Personal)', () => {
          render(<WorkspaceScopePanel />);
          // Scope line could contain "Managing:" or property address hints
          const el = screen.queryByText(/Managing:|Properties:/);
          expect(el).toBeNull();
        });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════
  // PROPERTY-SPECIFIC: delegator name + expiry
  // ═══════════════════════════════════════════════════════════

  describe('Property workspace — delegation details', () => {
    beforeEach(() => {
      mockUseWorkspaceContext.mockReturnValue(makeContext('PROPERTY'));
      mockUseSession.mockReturnValue(makeSession());
      mockUseDelegations.mockReturnValue({
        data: [activeDelegation()],
        isLoading: false,
      });
    });

    it('shows delegator name "Owner Owens"', () => {
      render(<WorkspaceScopePanel />);
      const el = screen.queryByText(/Owner Owens/);
      expect(el).not.toBeNull();
    });

    it('shows formatted expiry date', () => {
      render(<WorkspaceScopePanel />);
      const el = screen.queryByText(/6\/15\/2027/);
      expect(el).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Missing-field behaviour (UI-SPEC Field Rules)
  // ═══════════════════════════════════════════════════════════

  describe('Missing-field behaviour', () => {
    let debugSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
      vi.spyOn(logger, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      debugSpy.mockRestore();
      vi.mocked(logger.warn).mockRestore();
    });

    it('renders "Unnamed workspace" when name is unresolved', () => {
      mockUseWorkspaceContext.mockReturnValue(
        makeContext('PROPERTY', { scope: { propertyId: 'unknown-prop' } })
      );
      mockUseSession.mockReturnValue(makeSession({ name: null }));
      mockUseDelegations.mockReturnValue({ data: [], isLoading: false });

      render(<WorkspaceScopePanel />);
      // Stub returns null → this WILL FAIL (expected in RED)
      expect(screen.queryByText('Unnamed workspace')).not.toBeNull();
    });

    it('renders "—No permissions—" when permissions array is empty', () => {
      mockUseWorkspaceContext.mockReturnValue(makeContext('PROVIDER', { permissions: [] }));
      mockUseSession.mockReturnValue(makeSession());
      mockUseDelegations.mockReturnValue({ data: [], isLoading: false });

      render(<WorkspaceScopePanel />);
      expect(screen.queryByText(/—No permissions—/)).not.toBeNull();
    });

    it('renders "Expires: Never" when expiresAt is null', () => {
      mockUseWorkspaceContext.mockReturnValue(makeContext('PROPERTY'));
      mockUseSession.mockReturnValue(makeSession());
      mockUseDelegations.mockReturnValue({
        data: [activeDelegation({ expiresAt: null as unknown as string })],
        isLoading: false,
      });

      render(<WorkspaceScopePanel />);
      const el = screen.queryByText(/Expires:\s*Never/);
      expect(el).not.toBeNull();
    });

    it('hides scope line when scope is unset (Personal)', () => {
      mockUseWorkspaceContext.mockReturnValue(makeContext('PERSONAL'));
      mockUseSession.mockReturnValue(makeSession());

      render(<WorkspaceScopePanel />);
      const scopeEl = screen.queryByText(/Managing:|Properties:|Delegated by/);
      expect(scopeEl).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PII Guard — Pino workspace.scope.rendered (T-122-09)
  // ═══════════════════════════════════════════════════════════

  describe('PII guard — workspace.scope.rendered event (T-122-09)', () => {
    let debugSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
      vi.spyOn(logger, 'warn').mockImplementation(() => {});
      mockUseSession.mockReturnValue(makeSession());
    });

    afterEach(() => {
      debugSpy.mockRestore();
      vi.mocked(logger.warn).mockRestore();
    });

    it('emits workspace.scope.rendered with workspaceId, workspaceType, fieldsMissing', () => {
      mockUseWorkspaceContext.mockReturnValue(makeContext('PERSONAL'));
      mockUseDelegations.mockReturnValue({ data: undefined, isLoading: false });

      render(<WorkspaceScopePanel />);

      // Stub returns null, so no log event fires. This WILL FAIL — expected RED.
      // GREEN must fire the debug event.
      const renderedCalls = debugSpy.mock.calls.filter(
        ([obj]: [Record<string, unknown>]) => obj && typeof obj === 'object' && 'workspaceId' in obj
      );

      expect(renderedCalls.length).toBeGreaterThanOrEqual(1);

      if (renderedCalls.length > 0) {
        const loggedObj = renderedCalls[0][0] as Record<string, unknown>;
        // Required fields
        expect(loggedObj).toHaveProperty('workspaceId');
        expect(loggedObj).toHaveProperty('workspaceType');
        expect(loggedObj).toHaveProperty('fieldsMissing');
        expect(Array.isArray(loggedObj.fieldsMissing)).toBe(true);
      }
    });

    it('NEVER logs permissions[] array values in workspace.scope.rendered', () => {
      mockUseWorkspaceContext.mockReturnValue(makeContext('PROPERTY'));
      mockUseDelegations.mockReturnValue({
        data: [activeDelegation()],
        isLoading: false,
      });

      render(<WorkspaceScopePanel />);

      const renderedCalls = debugSpy.mock.calls.filter(
        ([obj]: [Record<string, unknown>]) => obj && typeof obj === 'object' && 'workspaceId' in obj
      );

      for (const call of renderedCalls) {
        const obj = call[0] as Record<string, unknown>;
        // Serialize and check for PII leakage
        const serialized = JSON.stringify(obj);
        expect(serialized).not.toContain('maintenance:read');
        expect(serialized).not.toContain('maintenance:create');
        expect(serialized).not.toContain('documents:read');
      }
    });

    it('NEVER logs delegator PII (grantedByName) in workspace.scope.rendered', () => {
      mockUseWorkspaceContext.mockReturnValue(makeContext('PROPERTY'));
      mockUseDelegations.mockReturnValue({
        data: [activeDelegation({ grantedByName: 'Jane Owner' })],
        isLoading: false,
      });

      render(<WorkspaceScopePanel />);

      const renderedCalls = debugSpy.mock.calls.filter(
        ([obj]: [Record<string, unknown>]) => obj && typeof obj === 'object' && 'workspaceId' in obj
      );

      for (const call of renderedCalls) {
        const obj = call[0] as Record<string, unknown>;
        const serialized = JSON.stringify(obj);
        expect(serialized).not.toContain('Jane Owner');
        expect(obj).not.toHaveProperty('grantedByName');
      }
    });

    it('NEVER logs propertyAddress PII in workspace.scope.rendered', () => {
      mockUseWorkspaceContext.mockReturnValue(makeContext('PROPERTY'));
      mockUseDelegations.mockReturnValue({
        data: [activeDelegation({ propertyAddress: '14 Palm Avenue' })],
        isLoading: false,
      });

      render(<WorkspaceScopePanel />);

      const renderedCalls = debugSpy.mock.calls.filter(
        ([obj]: [Record<string, unknown>]) => obj && typeof obj === 'object' && 'workspaceId' in obj
      );

      for (const call of renderedCalls) {
        const obj = call[0] as Record<string, unknown>;
        const serialized = JSON.stringify(obj);
        expect(serialized).not.toContain('14 Palm Avenue');
        expect(obj).not.toHaveProperty('propertyAddress');
      }
    });
  });
});
