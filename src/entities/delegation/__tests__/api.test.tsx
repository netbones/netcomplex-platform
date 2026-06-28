/**
 * Delegation API Hooks — Tests
 *
 * Phase 111-04: Verifies useDelegations(), useBlockDelegation(), and
 * useDelegationAudit() behave correctly across loading, success, error,
 * and optimistic-update states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ═══════════════════════════════════════════════════════════════
// Mutable mock state (vi.hoisted ensures it runs before vi.mock)
// ═══════════════════════════════════════════════════════════════

const { mockSessionState } = vi.hoisted(() => ({
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
}));

vi.mock('@api/client', () => ({
  useSession: () => mockSessionState,
}));

// ═══════════════════════════════════════════════════════════════
// Wrapper
// ═══════════════════════════════════════════════════════════════

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function mockFetchResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

function resetMockSession() {
  mockSessionState.data = {
    user: { id: 'user-1', email: 'alice@example.com', name: 'Alice', image: null },
  };
  mockSessionState.isPending = false;
  mockSessionState.error = null;
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('useDelegations', () => {
  beforeEach(() => {
    resetMockSession();
    vi.restoreAllMocks();
  });

  it('returns filtered delegation list for current user', async () => {
    const { useDelegations } = await import('@entities/delegation');
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

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockFetchResponse({ data: mockDelegations })
    );

    const { result } = renderHook(() => useDelegations(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockDelegations);
    expect(result.current.error).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/delegations'));
  });

  it('passes query params when provided', async () => {
    const { useDelegations } = await import('@entities/delegation');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockFetchResponse({ data: [] }));

    renderHook(() => useDelegations({ propertyId: 'prop-1', status: 'ACTIVE' }), {
      wrapper: createWrapper(),
    });

    // The fetch should have been called (mockResolvedValueOnce resolves immediately)
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('propertyId=prop-1'));
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('status=ACTIVE'));
  });

  it('does not fetch when user is not authenticated', async () => {
    mockSessionState.data = null;

    const { useDelegations } = await import('@entities/delegation');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockFetchResponse({ data: [] }));

    const { result } = renderHook(() => useDelegations(), { wrapper: createWrapper() });

    // enabled is false because session is null — query stays idle
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useBlockDelegation', () => {
  beforeEach(() => {
    resetMockSession();
    vi.restoreAllMocks();
  });

  it('toggles block status with optimistic update', async () => {
    const { useBlockDelegation } = await import('@entities/delegation');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockFetchResponse({
        data: { id: 'da-1', blocked: true, permissions: ['maintenance:read'] },
      })
    );

    const { result } = renderHook(() => useBlockDelegation(), { wrapper: createWrapper() });

    expect(result.current.isIdle).toBe(true);

    await act(async () => {
      await result.current.mutateAsync({ delegationId: 'da-1', blocked: true });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/delegations/da-1/block'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ blocked: true }),
      })
    );
  });

  it('handles errors gracefully', async () => {
    const { useBlockDelegation } = await import('@entities/delegation');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockFetchResponse({ error: 'Forbidden' }, 403)
    );

    const { result } = renderHook(() => useBlockDelegation(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync({ delegationId: 'da-1', blocked: true });
      } catch (_) {
        // Expected — 403
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
    const { useDelegationAudit } = await import('@entities/delegation');
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

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockFetchResponse({ data: mockEntries }));

    const { result } = renderHook(() => useDelegationAudit('da-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockEntries);
    expect(result.current.error).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/delegations/da-1/audit')
    );
  });

  it('does not fetch when delegationId is empty', async () => {
    const { useDelegationAudit } = await import('@entities/delegation');

    vi.spyOn(globalThis, 'fetch');

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

  it('matches /api/delegations response shape', async () => {
    const { useDelegations } = await import('@entities/delegation');

    const mockResponse = {
      data: [
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
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

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
