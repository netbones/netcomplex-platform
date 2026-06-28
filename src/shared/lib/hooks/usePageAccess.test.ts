/**
 * usePageAccess hook tests — TDD RED phase
 *
 * Tests the TanStack Query wrapper for /api/access:
 * - Returns { spaces, pages, features, agent, isLoading, error }
 * - Handles loading, error, and unauthenticated states
 * - Respects session gate for query enabled
 * - Supports refetch
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// ── Mock useSession ──────────────────────────────────────────────
vi.mock('@api/client', () => ({
  useSession: vi.fn(),
}));

// ── Mock useQuery from @tanstack/react-query ─────────────────────
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { useSession } from '@api/client';
import { usePageAccess, useVisibleSpaces } from './usePageAccess';

const mockUseSession = vi.mocked(useSession);

// ── Test Helpers ─────────────────────────────────────────────────

/** Build a mock session with an optional role override */
function makeSession(
  overrides: Partial<{
    userId: string;
    role: string;
    email: string;
  }> = {}
) {
  return {
    data: {
      user: {
        id: overrides.userId ?? 'user-1',
        role: overrides.role ?? 'RESIDENT',
        email: overrides.email ?? 'test@soralia.village',
      },
      session: {},
    },
    isPending: false,
    isRefetching: false,
    error: null,
    refetch: vi.fn(),
  };
}

/** Build a mock useQuery return with access response data */
function makeQueryResult(
  overrides: Partial<{
    data: {
      spaces: string[];
      pages: string[];
      features: string[];
      agent: { scope: string[]; expiresAt: string | null } | null;
      resolvedAt: string;
    };
    isLoading: boolean;
    error: Error | null;
  }> = {}
) {
  return {
    data: overrides.data ?? null,
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    refetch: vi.fn(),
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('usePageAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated RESIDENT
    mockUseSession.mockReturnValue(makeSession() as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────
  // Test 1: Returns expected shape on mount (happy path)
  // ──────────────────────────────────────────────────────────────
  it('returns { spaces, pages, features, agent, isLoading, error } on mount', () => {
    const mockRefetch = vi.fn();
    mockUseQuery.mockReturnValue({
      data: {
        spaces: ['home', 'messages'],
        pages: ['dashboard', 'events'],
        features: ['chat', 'bookings'],
        agent: null,
        resolvedAt: '2026-06-26T00:00:00.000Z',
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => usePageAccess());

    expect(result.current.spaces).toEqual(['home', 'messages']);
    expect(result.current.pages).toEqual(['dashboard', 'events']);
    expect(result.current.features).toEqual(['chat', 'bookings']);
    expect(result.current.agent).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.refetch).toBe(mockRefetch);
  });

  // ──────────────────────────────────────────────────────────────
  // Test 2: isLoading is true while query is in-flight
  // ──────────────────────────────────────────────────────────────
  it('isLoading is true while query is in-flight, false after resolution', () => {
    // In-flight
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { result: loadingResult } = renderHook(() => usePageAccess());
    expect(loadingResult.current.isLoading).toBe(true);
    expect(loadingResult.current.spaces).toEqual([]);
    expect(loadingResult.current.pages).toEqual([]);
    expect(loadingResult.current.features).toEqual([]);
    expect(loadingResult.current.agent).toBeNull();

    // After resolution (re-render with new mock)
    mockUseQuery.mockReturnValue({
      data: {
        spaces: ['home'],
        pages: ['dashboard'],
        features: ['chat'],
        agent: null,
        resolvedAt: '2026-06-26T00:00:00.000Z',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result: resolvedResult } = renderHook(() => usePageAccess());
    expect(resolvedResult.current.isLoading).toBe(false);
    expect(resolvedResult.current.spaces).toEqual(['home']);
  });

  // ──────────────────────────────────────────────────────────────
  // Test 3: Spaces contains home and messages for RESIDENT
  // ──────────────────────────────────────────────────────────────
  it('spaces contains home and messages for RESIDENT', () => {
    mockUseQuery.mockReturnValue({
      data: {
        spaces: ['home', 'messages'],
        pages: ['dashboard'],
        features: ['chat'],
        agent: null,
        resolvedAt: '2026-06-26T00:00:00.000Z',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => usePageAccess());

    expect(result.current.spaces).toContain('home');
    expect(result.current.spaces).toContain('messages');
    expect(result.current.spaces).not.toContain('admin');
    expect(result.current.spaces).not.toContain('providers');
  });

  // ──────────────────────────────────────────────────────────────
  // Test 4: Spaces contains providers when authenticated provider
  //         has provider record
  // ──────────────────────────────────────────────────────────────
  it('spaces contains providers when authenticated provider has provider record', () => {
    mockUseQuery.mockReturnValue({
      data: {
        spaces: ['providers', 'messages'],
        pages: ['providers'],
        features: ['providers'],
        agent: null,
        resolvedAt: '2026-06-26T00:00:00.000Z',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => usePageAccess());

    expect(result.current.spaces).toContain('providers');
    expect(result.current.spaces).toContain('messages');
    // Provider shouldn't see resident/admin spaces
    expect(result.current.spaces).not.toContain('home');
    expect(result.current.spaces).not.toContain('admin');
  });

  // ──────────────────────────────────────────────────────────────
  // Test 5: refetch invalidates and re-fetches from /api/access
  // ──────────────────────────────────────────────────────────────
  it('refetch calls the underlying query refetch function', () => {
    const mockRefetch = vi.fn();
    mockUseQuery.mockReturnValue({
      data: {
        spaces: ['home'],
        pages: [],
        features: [],
        agent: null,
        resolvedAt: '2026-06-26T00:00:00.000Z',
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => usePageAccess());

    result.current.refetch();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  // ──────────────────────────────────────────────────────────────
  // Test 6: error state propagates when /api/access returns 500
  // ──────────────────────────────────────────────────────────────
  it('error state propagates when query errors', () => {
    const testError = new Error('Server error');
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: testError,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => usePageAccess());

    expect(result.current.error).toBe(testError);
    expect(result.current.spaces).toEqual([]);
    expect(result.current.pages).toEqual([]);
    expect(result.current.features).toEqual([]);
    expect(result.current.agent).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // Test 7: Unauthenticated returns empty (query disabled)
  // ──────────────────────────────────────────────────────────────
  it('unauthenticated returns empty spaces/pages/features (graceful degradation)', () => {
    // No session → query disabled
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
      isRefetching: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    // When disabled, TanStack Query returns idle state
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    // useQuery should NOT be called when query is disabled
    // The hook itself should return empty values
    const { result } = renderHook(() => usePageAccess());

    expect(result.current.spaces).toEqual([]);
    expect(result.current.pages).toEqual([]);
    expect(result.current.features).toEqual([]);
    expect(result.current.agent).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

// ── useVisibleSpaces tests ───────────────────────────────────────

describe('useVisibleSpaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue(makeSession() as never);
  });

  it('filters accessible space IDs through filterSpaces', () => {
    mockUseQuery.mockReturnValue({
      data: {
        spaces: ['home', 'messages', 'services'],
        pages: [],
        features: [],
        agent: null,
        resolvedAt: '2026-06-26T00:00:00.000Z',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useVisibleSpaces({
        services: true,
        events: false,
        groups: false,
        surveys: false,
        competitions: false,
        news: false,
      } as never)
    );

    expect(result.current.spaces).toHaveLength(3);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('auto-hides community space when all sub-flags are off', () => {
    mockUseQuery.mockReturnValue({
      data: {
        spaces: ['home', 'community'],
        pages: [],
        features: [],
        agent: null,
        resolvedAt: '2026-06-26T00:00:00.000Z',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useVisibleSpaces({
        events: false,
        groups: false,
        surveys: false,
        competitions: false,
        news: false,
      } as never)
    );

    // community should be filtered out
    const spaceIds = result.current.spaces.map(s => s.id);
    expect(spaceIds).not.toContain('community');
    expect(spaceIds).toContain('home');
  });

  it('passes through isLoading and error from usePageAccess', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useVisibleSpaces());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.spaces).toEqual([]);
  });
});
