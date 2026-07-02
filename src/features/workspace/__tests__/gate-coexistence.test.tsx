/**
 * gate-coexistence.test.tsx — Integration Test (C-04)
 *
 * Phase 122-03: RED phase — verifies that WorkspaceContext and GateContext
 * coexist without interference (C-04). Switching workspace does NOT mutate
 * GateContext role/flags, and mutating flags does NOT change the workspace.
 *
 * The test does NOT mock @features/gate — it renders a real composition
 * that consumes both hooks to catch interference (Pattern K table).
 * Instead, it mocks the upstream dependencies: useSession + usePageFlags.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { WorkspaceTarget } from '@entities/workspace';
import type { DelegationListItem } from '@entities/delegation';

// ═══════════════════════════════════════════════════════════════
// Mutable mock state — upstream deps for both hooks
// ═══════════════════════════════════════════════════════════════

const { mockSessionState, mockFlagsState, mockDelegationsList } = vi.hoisted(() => ({
  mockSessionState: {
    data: {
      user: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin User',
        image: null as string | null,
        // role is accessed via session.user.role (Better Auth additionalFields)
        role: 'ADMIN' as string,
      },
    },
    isPending: false,
    error: null,
  } as {
    data: {
      user: {
        id: string;
        email: string;
        name: string;
        image: string | null;
        role: string;
      };
    } | null;
    isPending: boolean;
    error: null;
  },
  mockFlagsState: {
    flags: {
      'agent-gateway': false as boolean,
      campaign: true as boolean,
      conservation: 'default' as const,
      conservationExternalUrl: '' as string,
      conservationManagedUrl: '' as string,
      chat: true as boolean,
      education: true as boolean,
      news: true as boolean,
      events: true as boolean,
      directory: true as boolean,
      groups: true as boolean,
      resources: true as boolean,
      services: true as boolean,
      surveys: true as boolean,
      competitions: true as boolean,
      bookings: true as boolean,
      maintenance: true as boolean,
      dWallet: false as boolean,
    },
    isLoading: false,
    error: null,
  },
  mockDelegationsList: [] as DelegationListItem[],
}));

vi.mock('@api/client', () => ({
  useSession: () => mockSessionState,
}));

vi.mock('@/shared/lib/hooks/usePageFlags', () => ({
  usePageFlags: () => mockFlagsState,
}));

vi.mock('@entities/delegation', () => ({
  useDelegations: () => ({
    data: mockDelegationsList,
    isLoading: false,
    error: null,
  }),
}));

// ═══════════════════════════════════════════════════════════════
// next/navigation mock
// ═══════════════════════════════════════════════════════════════

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(''),
}));

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function makeDelegation(overrides: Partial<DelegationListItem> = {}): DelegationListItem {
  return {
    id: 'd1',
    propertyId: 'prop-14-palm',
    propertyAddress: '14 Palm Avenue',
    agentId: 'a1',
    agentName: 'Agent Smith',
    agentEmail: 'agent@example.com',
    grantedById: 'o1',
    grantedByName: 'Owner Owens',
    permissions: ['maintenance:read'],
    status: 'ACTIVE',
    startedAt: '2026-01-01T00:00:00Z',
    expiresAt: '2027-12-31T00:00:00Z',
    acceptedAt: '2026-01-01T00:00:00Z',
    rejectedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

async function importSwitchWorkspace() {
  return await import('../model/switch-workspace');
}

async function createWrapperWithProvider() {
  const { WorkspaceContextProvider } = await import('../model/workspace-context');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        WorkspaceContextProvider,
        {
          initial: {
            workspaceId: 'personal:u1',
            workspaceType: 'PERSONAL',
            permissions: ['profile:read', 'settings:manage'],
          },
        },
        children
      )
    );
  };
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('gate-coexistence (C-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockClear();

    // Reset session — ADMIN role
    mockSessionState.data = {
      user: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Admin User',
        image: null,
        role: 'ADMIN',
      },
    };
    mockSessionState.isPending = false;
    mockSessionState.error = null;

    // Reset flags — known state
    mockFlagsState.flags = {
      'agent-gateway': false,
      campaign: true,
      conservation: 'default',
      conservationExternalUrl: '',
      conservationManagedUrl: '',
      chat: true,
      education: true,
      news: true,
      events: true,
      directory: true,
      groups: true,
      resources: true,
      services: true,
      surveys: true,
      competitions: true,
      bookings: true,
      maintenance: true,
      dWallet: false,
    };
    mockFlagsState.isLoading = false;
    mockFlagsState.error = null;

    mockDelegationsList.length = 0;
    mockDelegationsList.push(makeDelegation());
  });

  it('C-04: switching workspace does NOT mutate GateContext role/flags', async () => {
    const Wrapper = await createWrapperWithProvider();
    const { useWorkspaceContext } = await import('../model/workspace-context');
    const { useGateContext } = await import('../../gate/model/gate');
    const { useSwitchWorkspace } = await importSwitchWorkspace();

    const { result } = renderHook(
      () => ({
        wsCtx: useWorkspaceContext(),
        gateCtx: useGateContext(),
        switchWorkspace: useSwitchWorkspace(),
      }),
      { wrapper: Wrapper }
    );

    // Pre-condition: both contexts are available
    expect(result.current.gateCtx).not.toBeNull();
    expect(result.current.wsCtx).not.toBeNull();

    const originalGateRole = result.current.gateCtx!.role;
    const originalGateFlags = { ...result.current.gateCtx!.flags };
    const originalWsId = result.current.wsCtx!.workspaceId;

    expect(originalGateRole).toBe('ADMIN');
    expect(originalWsId).toBe('personal:u1');

    // Switch workspace to PROPERTY
    const target: WorkspaceTarget = {
      workspaceType: 'PROPERTY',
      delegationId: 'd1',
    };

    await act(async () => {
      await result.current.switchWorkspace(target);
    });

    // Workspace changed
    expect(result.current.wsCtx?.workspaceId).toBe('property:prop-14-palm');
    expect(result.current.wsCtx?.workspaceType).toBe('PROPERTY');

    // GateContext role UNCHANGED (C-04)
    expect(result.current.gateCtx?.role).toBe('ADMIN');
    // GateContext flags UNCHANGED
    expect(result.current.gateCtx?.flags).toEqual(originalGateFlags);
  });

  it('C-04: mutating GateContext flags does NOT change the workspace', async () => {
    const Wrapper = await createWrapperWithProvider();
    const { useWorkspaceContext } = await import('../model/workspace-context');
    const { useGateContext } = await import('../../gate/model/gate');

    const { result, rerender } = renderHook(
      () => ({
        wsCtx: useWorkspaceContext(),
        gateCtx: useGateContext(),
      }),
      { wrapper: Wrapper }
    );

    const originalWsId = result.current.wsCtx!.workspaceId;
    expect(originalWsId).toBe('personal:u1');

    // Mutate gate flags (simulating a feature toggle change)
    mockFlagsState.flags = {
      ...mockFlagsState.flags,
      maintenance: false, // turn maintenance page off
      chat: false, // turn chat off
    };

    // Force re-render by changing a mock dependency ref
    rerender();

    // GateContext flags should reflect the new values
    expect(result.current.gateCtx?.flags.maintenance).toBe(false);
    expect(result.current.gateCtx?.flags.chat).toBe(false);

    // Workspace should be UNCHANGED (C-04 isolation)
    expect(result.current.wsCtx?.workspaceId).toBe('personal:u1');
    expect(result.current.wsCtx?.workspaceType).toBe('PERSONAL');
  });

  it('C-04: both hooks return valid data simultaneously', async () => {
    const Wrapper = await createWrapperWithProvider();
    const { useWorkspaceContext } = await import('../model/workspace-context');
    const { useGateContext } = await import('../../gate/model/gate');

    const { result } = renderHook(
      () => ({
        wsCtx: useWorkspaceContext(),
        gateCtx: useGateContext(),
      }),
      { wrapper: Wrapper }
    );

    // Both hooks return non-null valid data simultaneously
    expect(result.current.gateCtx).not.toBeNull();
    expect(result.current.wsCtx).not.toBeNull();

    // GateContext has expected shape
    expect(result.current.gateCtx!.role).toBe('ADMIN');
    expect(typeof result.current.gateCtx!.flags).toBe('object');
    expect(result.current.gateCtx!.flags.campaign).toBe(true);

    // WorkspaceContext has expected shape
    expect(result.current.wsCtx!.workspaceId).toBe('personal:u1');
    expect(result.current.wsCtx!.workspaceType).toBe('PERSONAL');
    expect(Array.isArray(result.current.wsCtx!.permissions)).toBe(true);
  });
});
