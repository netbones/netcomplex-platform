/**
 * Delegation API Hooks — Tests (tRPC-backed)
 *
 * Phase 111-04: Verifies useDelegations(), useBlockDelegation(), and
 * useDelegationAudit() behave correctly across loading, success, error,
 * and optimistic-update states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuery, useMutation } from '@tanstack/react-query';
import React from 'react';

const { mockSessionState, mockDelegationData, mockAuditData, mockBlockResult } = vi.hoisted(() => ({
  mockSessionState: {
    data: {
      user: {
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
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
  mockDelegationData: [] as unknown[],
  mockAuditData: [] as unknown[],
  mockBlockResult: vi.fn(),
}));

vi.mock('@api/client', () => ({
  useSession: () => mockSessionState,
  trpc: {
    delegations: {
      listDelegations: {
        useQuery: (input: unknown, opts: { enabled?: boolean }) =>
          useQuery({
            queryKey: ['delegations'],
            queryFn: () => mockDelegationData,
            enabled: opts?.enabled ?? true,
          }),
      },
      getDelegationAudit: {
        useQuery: (input: { id: string }, opts: { enabled?: boolean }) =>
          useQuery({
            queryKey: ['delegation-audit', input.id],
            queryFn: () => mockAuditData,
            enabled: opts?.enabled ?? true,
          }),
      },
      blockDelegation: {
        useMutation: () =>
          useMutation({
            mutationFn: (input: { id: string; blocked: boolean }) => mockBlockResult(input),
          }),
      },
    },
    useUtils: () => ({
      delegations: {
        listDelegations: {
          invalidate: vi.fn(),
        },
      },
    }),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function resetMockSession() {
  mockSessionState.data = {
    user: { id: 'user-1', email: 'alice@example.com', name: 'Alice', image: null },
  };
  mockSessionState.isPending = false;
  mockSessionState.error = null;
}

describe('useDelegations', () => {
  beforeEach(() => {
    resetMockSession();
    vi.restoreAllMocks();
  });

  it('returns filtered delegation list for current user', async () => {
    const mockDelegations = [
      {
        id: 'da-1',
        propertyId: 'prop-1',
        propertyAddress: '183 Pagoda Rd',
        agentId: 'agent-1',
        agentName: 'John Agent',
        agentEmail: 'john@agent.com',
        grantedById: 'user-1',
        grantedByName: 'Alice',
        permissions: ['maintenance:read', 'communication:contact_occupant'],
        status: 'ACTIVE',
        startedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2027-01-01T00:00:00.000Z',
        acceptedAt: '2026-01-02T00:00:00.000Z',
        rejectedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    mockDelegationData.length = 0;
    mockDelegationData.push(...mockDelegations);

    const { useDelegations } = await import('@entities/delegation');

    const { result } = renderHook(() => useDelegations(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockDelegations);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when user is not authenticated', async () => {
    mockSessionState.data = null;

    const { useDelegations } = await import('@entities/delegation');

    const { result } = renderHook(() => useDelegations(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useBlockDelegation', () => {
  beforeEach(() => {
    resetMockSession();
    vi.restoreAllMocks();
    mockBlockResult.mockReset();
  });

  it('toggles block status', async () => {
    mockBlockResult.mockResolvedValue({
      id: 'da-1',
      blocked: true,
      permissions: ['maintenance:read'],
    });

    const { useBlockDelegation } = await import('@entities/delegation');

    const { result } = renderHook(() => useBlockDelegation(), { wrapper: createWrapper() });

    expect(result.current.isIdle).toBe(true);

    await act(async () => {
      await result.current.mutateAsync({ id: 'da-1', blocked: true });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockBlockResult).toHaveBeenCalledWith({ id: 'da-1', blocked: true });
  });

  it('handles errors gracefully', async () => {
    mockBlockResult.mockRejectedValue(new Error('Forbidden'));

    const { useBlockDelegation } = await import('@entities/delegation');

    const { result } = renderHook(() => useBlockDelegation(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync({ id: 'da-1', blocked: true });
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useDelegationAudit', () => {
  beforeEach(() => {
    resetMockSession();
    vi.restoreAllMocks();
  });

  it('returns chronological action log for a delegation', async () => {
    const mockEntries = [
      {
        id: 'dae-1',
        delegationId: 'da-1',
        action: 'created',
        actorId: 'user-1',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'dae-2',
        delegationId: 'da-1',
        action: 'accepted',
        actorId: 'agent-1',
        metadata: { note: 'Accepted terms' },
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ];
    mockAuditData.length = 0;
    mockAuditData.push(...mockEntries);

    const { useDelegationAudit } = await import('@entities/delegation');

    const { result } = renderHook(() => useDelegationAudit('da-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockEntries);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when delegationId is empty', async () => {
    const { useDelegationAudit } = await import('@entities/delegation');

    const { result } = renderHook(() => useDelegationAudit(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('DelegationListItem type', () => {
  beforeEach(() => {
    resetMockSession();
    vi.restoreAllMocks();
  });

  it('matches delegation response shape', async () => {
    const mockResponse = [
      {
        id: 'da-1',
        propertyId: 'prop-1',
        propertyAddress: '183 Pagoda Rd',
        agentId: 'agent-1',
        agentName: 'John Agent',
        agentEmail: 'john@agent.com',
        grantedById: 'user-1',
        grantedByName: 'Alice',
        permissions: ['maintenance:read', 'communication:contact_occupant'],
        status: 'ACTIVE',
        startedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2027-01-01T00:00:00.000Z',
        acceptedAt: '2026-01-02T00:00:00.000Z',
        rejectedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        blocked: false,
      },
    ];
    mockDelegationData.length = 0;
    mockDelegationData.push(...mockResponse);

    const { useDelegations } = await import('@entities/delegation');

    const { result } = renderHook(() => useDelegations(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const item = result.current.data?.[0];
    expect(item).toBeDefined();
    expect(typeof item!.id).toBe('string');
    expect(typeof item!.propertyId).toBe('string');
    expect(item!.propertyAddress === '183 Pagoda Rd' || item!.propertyAddress === null).toBe(true);
    expect(typeof item!.agentId).toBe('string');
    expect(typeof item!.permissions).toBe('object');
    expect(Array.isArray(item!.permissions)).toBe(true);
    expect(['PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED']).toContain(item!.status);
    expect(item!).toHaveProperty('blocked');
  });
});
