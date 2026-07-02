/**
 * switchWorkspace() — Unit Tests (6 branches + P-01/P-02/P-03)
 *
 * Phase 122-03: RED phase — tests fail until switchWorkspace + useSwitchWorkspace
 * are implemented in Task 2.
 *
 * Mock patterns follow src/entities/delegation/__tests__/api.test.tsx
 * (vi.hoisted typed builders) + new next/navigation mock (Pattern K).
 *
 * No `as any` casts — typed builders per AGENTS.md strict TypeScript.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { WorkspaceContext, WorkspaceTarget } from '@entities/workspace';
import type { Permission } from '@entities/workspace';
import type { DelegationListItem } from '@entities/delegation';

// ═══════════════════════════════════════════════════════════════
// Mutable mock state (vi.hoisted runs before vi.mock)
// ═══════════════════════════════════════════════════════════════

const { mockSessionState, mockDelegationsList } = vi.hoisted(() => ({
  mockSessionState: {
    data: {
      user: {
        id: 'u1',
        email: 'agent@example.com',
        name: 'Agent Smith',
        image: null as string | null,
      },
    },
    isPending: false,
    error: null,
  } as {
    data: { user: { id: string; email: string; name: string; image: string | null } } | null;
    isPending: boolean;
    error: null;
  },
  mockDelegationsList: [] as DelegationListItem[],
}));

vi.mock('@api/client', () => ({
  useSession: () => mockSessionState,
}));

vi.mock('@entities/delegation', () => ({
  useDelegations: () => ({
    data: mockDelegationsList,
    isLoading: false,
    error: null,
  }),
}));

// ═══════════════════════════════════════════════════════════════
// next/navigation mock (Pattern K — new pattern, no in-repo analog)
// ═══════════════════════════════════════════════════════════════

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(''),
}));

// ═══════════════════════════════════════════════════════════════
// Static import — workspace-context.tsx exists from 122-02
import { WorkspaceContextProvider } from '../../model/workspace-context';

// Dynamic imports after mocks are installed
// ═══════════════════════════════════════════════════════════════

async function importSwitchWorkspace() {
  return await import('../switch-workspace');
}

// ═══════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════

/** Build an ACTIVE delegation for test fixtures. */
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
    permissions: ['maintenance:read', 'maintenance:create'],
    status: 'ACTIVE',
    startedAt: '2026-01-01T00:00:00Z',
    expiresAt: '2027-12-31T00:00:00Z',
    acceptedAt: '2026-01-01T00:00:00Z',
    rejectedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Build a PERSONAL WorkspaceContext. */
function makePersonalContext(): WorkspaceContext {
  return {
    workspaceId: 'personal:u1',
    workspaceType: 'PERSONAL',
    permissions: ['profile:read', 'settings:manage'] as Permission[],
  };
}

/** Create a wrapper with WorkspaceContextProvider + QueryClientProvider. */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    // We need to dynamically import the provider — at RED stage this file
    // doesn't exist for switch-workspace, but workspace-context.tsx from 122-02
    // DOES exist. We'll use it.
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function createWrapperWithProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <WorkspaceContextProvider initial={makePersonalContext()}>
        {children}
      </WorkspaceContextProvider>
    </QueryClientProvider>
  );
  return Wrapper;
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('switchWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockClear();
    replaceMock.mockClear();
    // Reset to a known session + single active delegation
    mockSessionState.data = {
      user: { id: 'u1', email: 'agent@example.com', name: 'Agent Smith', image: null },
    };
    mockSessionState.isPending = false;
    mockSessionState.error = null;
    mockDelegationsList.length = 0;
    mockDelegationsList.push(makeDelegation());
  });

  // ── Branch 1: success — atomic replace (P-01) ─────────────

  it('P-01: atomically replaces WorkspaceContext on successful PROPERTY switch', async () => {
    const Wrapper = await createWrapperWithProvider();
    const { useWorkspaceContext } = await import('../../model/workspace-context');
    const { useSwitchWorkspace } = await importSwitchWorkspace();

    const { result } = renderHook(
      () => ({
        ctx: useWorkspaceContext(),
        switchWorkspace: useSwitchWorkspace(),
      }),
      { wrapper: Wrapper }
    );

    // Pre-condition: initial context is PERSONAL
    expect(result.current.ctx?.workspaceId).toBe('personal:u1');
    expect(result.current.ctx?.workspaceType).toBe('PERSONAL');

    // Switch to PROPERTY via active delegation
    const target: WorkspaceTarget = {
      workspaceType: 'PROPERTY',
      delegationId: 'd1',
    };

    await act(async () => {
      await result.current.switchWorkspace(target);
    });

    // P-01: atomic replace — new context is PROPERTY with correct scope
    expect(result.current.ctx?.workspaceId).toBe('property:prop-14-palm');
    expect(result.current.ctx?.workspaceType).toBe('PROPERTY');
    expect(result.current.ctx?.scope?.propertyId).toBe('prop-14-palm');
    // Object.is identity should be different (wholesale replacement)
    expect(result.current.ctx).not.toBe(makePersonalContext());
    // router.push called exactly once on success
    expect(pushMock).toHaveBeenCalledOnce();
  });

  // ── Branch 2: idempotency — switching to current (P-02) ──

  it('P-02: switching to current workspaceId is a no-op (no navigate, no toast)', async () => {
    const Wrapper = await createWrapperWithProvider();
    const { useWorkspaceContext } = await import('../../model/workspace-context');
    const { useSwitchWorkspace } = await importSwitchWorkspace();

    const { result } = renderHook(
      () => ({
        ctx: useWorkspaceContext(),
        switchWorkspace: useSwitchWorkspace(),
      }),
      { wrapper: Wrapper }
    );

    const originalCtx = result.current.ctx;

    // Switch to PERSONAL (current workspace)
    const target: WorkspaceTarget = { workspaceType: 'PERSONAL' };

    await act(async () => {
      await result.current.switchWorkspace(target);
    });

    // Context unchanged
    expect(result.current.ctx?.workspaceId).toBe('personal:u1');
    // Identity unchanged — no replacement happened
    expect(result.current.ctx).toBe(originalCtx);
    // router.push NOT called
    expect(pushMock).not.toHaveBeenCalled();
  });

  // ── Branch 3: rollback on REVOKED delegation (P-03) ───────

  it('P-03: rollback — REVOKED delegation leaves prior context intact', async () => {
    // Override the delegation to be REVOKED
    mockDelegationsList.length = 0;
    mockDelegationsList.push(makeDelegation({ status: 'REVOKED' }));

    const Wrapper = await createWrapperWithProvider();
    const { useWorkspaceContext } = await import('../../model/workspace-context');
    const { useSwitchWorkspace } = await importSwitchWorkspace();

    const { result } = renderHook(
      () => ({
        ctx: useWorkspaceContext(),
        switchWorkspace: useSwitchWorkspace(),
      }),
      { wrapper: Wrapper }
    );

    const originalCtx = result.current.ctx;
    expect(originalCtx?.workspaceId).toBe('personal:u1');

    const target: WorkspaceTarget = {
      workspaceType: 'PROPERTY',
      delegationId: 'd1',
    };

    let threw = false;
    await act(async () => {
      try {
        await result.current.switchWorkspace(target);
      } catch {
        threw = true;
      }
    });

    expect(threw).toBe(true);
    // P-03: prior context unchanged — rollback preserved
    expect(result.current.ctx?.workspaceId).toBe('personal:u1');
    expect(result.current.ctx).toBe(originalCtx);
    // No navigation on failure
    expect(pushMock).not.toHaveBeenCalled();
  });

  // ── Branch 4: rollback on registry_miss ───────────────────

  it('rollback — registry_miss (unknown delegationId) leaves prior context intact', async () => {
    mockDelegationsList.length = 0; // empty list — no delegation found

    const Wrapper = await createWrapperWithProvider();
    const { useWorkspaceContext } = await import('../../model/workspace-context');
    const { useSwitchWorkspace } = await importSwitchWorkspace();

    const { result } = renderHook(
      () => ({
        ctx: useWorkspaceContext(),
        switchWorkspace: useSwitchWorkspace(),
      }),
      { wrapper: Wrapper }
    );

    const target: WorkspaceTarget = {
      workspaceType: 'PROPERTY',
      delegationId: 'missing-d1',
    };

    let threw = false;
    await act(async () => {
      try {
        await result.current.switchWorkspace(target);
      } catch {
        threw = true;
      }
    });

    expect(threw).toBe(true);
    // Prior context unchanged
    expect(result.current.ctx?.workspaceId).toBe('personal:u1');
    // No navigation
    expect(pushMock).not.toHaveBeenCalled();
  });

  // ── Branch 5: rollback on expired delegation ──────────────

  it('rollback — expired delegation (expiresAt in past) leaves prior context intact', async () => {
    mockDelegationsList.length = 0;
    mockDelegationsList.push(
      makeDelegation({
        id: 'd-expired',
        expiresAt: '2020-01-01T00:00:00Z', // in the past
      })
    );

    const Wrapper = await createWrapperWithProvider();
    const { useWorkspaceContext } = await import('../../model/workspace-context');
    const { useSwitchWorkspace } = await importSwitchWorkspace();

    const { result } = renderHook(
      () => ({
        ctx: useWorkspaceContext(),
        switchWorkspace: useSwitchWorkspace(),
      }),
      { wrapper: Wrapper }
    );

    const target: WorkspaceTarget = {
      workspaceType: 'PROPERTY',
      delegationId: 'd-expired',
    };

    let threw = false;
    await act(async () => {
      try {
        await result.current.switchWorkspace(target);
      } catch {
        threw = true;
      }
    });

    expect(threw).toBe(true);
    // Prior context unchanged
    expect(result.current.ctx?.workspaceId).toBe('personal:u1');
    // No navigation
    expect(pushMock).not.toHaveBeenCalled();
  });

  // ── Branch 6: network error / unexpected throw ────────────

  it('rollback — network error leaves prior context intact, no navigation', async () => {
    // Remove all delegations so resolveWorkspaceContext throws registry_miss
    mockDelegationsList.length = 0;

    const Wrapper = await createWrapperWithProvider();
    const { useWorkspaceContext } = await import('../../model/workspace-context');
    const { useSwitchWorkspace } = await importSwitchWorkspace();

    const { result } = renderHook(
      () => ({
        ctx: useWorkspaceContext(),
        switchWorkspace: useSwitchWorkspace(),
      }),
      { wrapper: Wrapper }
    );

    const target: WorkspaceTarget = {
      workspaceType: 'PROPERTY',
      delegationId: 'non-existent',
    };

    let threw = false;
    await act(async () => {
      try {
        await result.current.switchWorkspace(target);
      } catch {
        threw = true;
      }
    });

    expect(threw).toBe(true);
    // Prior context unchanged — rollback semantics hold for any error
    expect(result.current.ctx?.workspaceId).toBe('personal:u1');
    // No navigation
    expect(pushMock).not.toHaveBeenCalled();
  });
});
