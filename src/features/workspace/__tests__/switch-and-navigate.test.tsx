/**
 * switch-and-navigate.test.tsx — Integration Test
 *
 * Phase 122-03: RED phase — verifies that router.push is called AFTER
 * setCtx(nextCtx), enforcing the atomic replace before navigation
 * (UI-SPEC §'Atomic Workspace Switch' step ordering).
 *
 * Mock patterns: vi.hoisted typed builders + next/navigation mock (Pattern K).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { WorkspaceTarget } from '@entities/workspace';
import type { DelegationListItem } from '@entities/delegation';

// ═══════════════════════════════════════════════════════════════
// Mutable mock state
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
// next/navigation mock — track call order
// ═══════════════════════════════════════════════════════════════

const callOrder: string[] = [];
const pushMock = vi.fn(() => {
  callOrder.push('push');
});

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

describe('switch-and-navigate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockClear();
    callOrder.length = 0;
    mockSessionState.data = {
      user: { id: 'u1', email: 'agent@example.com', name: 'Agent Smith', image: null },
    };
    mockSessionState.isPending = false;
    mockSessionState.error = null;
    mockDelegationsList.length = 0;
    mockDelegationsList.push(makeDelegation());
  });

  it('router.push is called AFTER setCtx (atomic replace before navigation)', async () => {
    const Wrapper = await createWrapperWithProvider();
    const { useWorkspaceContext } = await import('../model/workspace-context');
    const { useSwitchWorkspace } = await importSwitchWorkspace();

    const ctxSnapshots: Array<{ workspaceId: string | undefined }> = [];

    const { result } = renderHook(
      () => {
        const ctx = useWorkspaceContext();
        ctxSnapshots.push({ workspaceId: ctx?.workspaceId });
        return {
          ctx,
          switchWorkspace: useSwitchWorkspace(),
        };
      },
      { wrapper: Wrapper }
    );

    // Before switch
    expect(ctxSnapshots[0]?.workspaceId).toBe('personal:u1');

    const target: WorkspaceTarget = {
      workspaceType: 'PROPERTY',
      delegationId: 'd1',
    };

    await act(async () => {
      await result.current.switchWorkspace(target);
    });

    // After switch: context should be PROPERTY, push should have been called
    expect(result.current.ctx?.workspaceId).toBe('property:prop-14-palm');
    expect(result.current.ctx?.workspaceType).toBe('PROPERTY');

    // router.push called exactly once with the resource route
    expect(pushMock).toHaveBeenCalledOnce();

    // Key assertion: the last snapshot must show the new workspace ID
    const lastSnapshot = ctxSnapshots[ctxSnapshots.length - 1];
    expect(lastSnapshot?.workspaceId).toBe('property:prop-14-palm');
  });

  it('router.push called with options.href when provided', async () => {
    const Wrapper = await createWrapperWithProvider();
    const { useSwitchWorkspace } = await importSwitchWorkspace();

    const { result } = renderHook(() => ({ switchWorkspace: useSwitchWorkspace() }), {
      wrapper: Wrapper,
    });

    const target: WorkspaceTarget = {
      workspaceType: 'PROPERTY',
      delegationId: 'd1',
    };

    await act(async () => {
      await result.current.switchWorkspace(target, {
        href: '/properties/prop-14-palm/maintenance',
      });
    });

    // router.push was called with the provided href
    expect(pushMock).toHaveBeenCalledWith('/properties/prop-14-palm/maintenance');
  });

  it('does NOT call router.push on resolve failure', async () => {
    mockDelegationsList.length = 0; // no delegations → resolve fails

    const Wrapper = await createWrapperWithProvider();
    const { useSwitchWorkspace } = await importSwitchWorkspace();

    const { result } = renderHook(() => ({ switchWorkspace: useSwitchWorkspace() }), {
      wrapper: Wrapper,
    });

    const target: WorkspaceTarget = {
      workspaceType: 'PROPERTY',
      delegationId: 'missing',
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
    expect(pushMock).not.toHaveBeenCalled();
  });
});
