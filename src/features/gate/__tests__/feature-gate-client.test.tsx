'use client';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import type { PlatformPageFlags, HeaderLinkId, Role, TierLevel } from '@shared/lib';

vi.mock('@api/client', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/shared/lib/hooks/usePageFlags', () => ({
  usePageFlags: vi.fn(),
}));

import { canAccessClient, useGateContext, useCanAccess, GateGuard } from '@features/gate';
import { useSession } from '@api/client';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';

const mockUseSession = vi.mocked(useSession);
const mockUsePageFlags = vi.mocked(usePageFlags);

function makeFlags(overrides: Partial<PlatformPageFlags> = {}): PlatformPageFlags {
  return {
    campaign: true,
    conservation: 'default' as const,
    conservationExternalUrl: '',
    conservationManagedUrl: '',
    education: true,
    'agent-gateway': true,
    chat: true,
    news: true,
    events: true,
    directory: true,
    groups: true,
    services: true,
    resources: true,
    maintenance: true,
    surveys: true,
    competitions: true,
    dashboard: true,
    disputes: false,
    dWallet: false,
    bookings: true,
    messages: true,
    providers: true,
    marketplacePaypal: false,
    headerLinks: ['directory', 'groups', 'services', 'resources'],
    ...overrides,
  } satisfies PlatformPageFlags;
}

function makeCtx(
  overrides: {
    role?: Role;
    flags?: Partial<PlatformPageFlags>;
    tier?: TierLevel;
  } = {}
) {
  return {
    role: (overrides.role ?? 'RESIDENT') as Role,
    flags: makeFlags(overrides.flags),
    tier: overrides.tier,
  };
}

describe('canAccessClient', () => {
  it('Layer 0: denies unknown role (GUEST not in ROLE_PERMISSIONS)', () => {
    const ctx = makeCtx({
      // @ts-expect-error GUEST is intentionally not a valid Role
      role: 'GUEST',
    });
    const result = canAccessClient(ctx, 'bookings');
    expect(result).toEqual({ allowed: false, reason: 'role' });
  });

  it('Layer 0: allows known role RESIDENT', () => {
    const ctx = makeCtx({ role: 'RESIDENT' });
    const result = canAccessClient(ctx, 'events');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('allowed');
  });

  it('Layer 3: denies when flag is false', () => {
    const ctx = makeCtx({ flags: { bookings: false } });
    const result = canAccessClient(ctx, 'bookings');
    expect(result).toEqual({ allowed: false, reason: 'flag' });
  });

  it('Layer 3: allows when flag is true', () => {
    const ctx = makeCtx({ flags: { bookings: true } });
    const result = canAccessClient(ctx, 'bookings');
    expect(result.allowed).toBe(true);
  });

  it('Layer 3: permits tri-state (non-boolean) flag values', () => {
    const ctx = makeCtx({ flags: { conservation: 'managed' } });
    const result = canAccessClient(ctx, 'conservation');
    expect(result.allowed).toBe(true);
  });

  it('Layer 3 skipFlag: allows when flag is false but skipFlag is true', () => {
    const ctx = makeCtx({ flags: { bookings: false } });
    const result = canAccessClient(ctx, 'bookings', { skipFlag: true });
    expect(result.allowed).toBe(true);
  });

  it('Layer 4: denies when tier is too low for feature', () => {
    const ctx = makeCtx({ tier: 'foundation' });
    const result = canAccessClient(ctx, 'services');
    expect(result).toEqual({ allowed: false, reason: 'feature' });
  });

  it('Layer 4: permissive when tier is absent (undefined)', () => {
    const ctx = makeCtx();
    delete ctx.tier;
    const result = canAccessClient(ctx, 'services');
    expect(result.allowed).toBe(true);
  });

  it('Layer 4: skipped for features with null registry mapping (competitions)', () => {
    const ctx = makeCtx({ tier: 'foundation' });
    const result = canAccessClient(ctx, 'competitions');
    expect(result.allowed).toBe(true);
  });

  it('Layer 4: skipped for features with null registry mapping (dashboard)', () => {
    const ctx = makeCtx({ tier: 'foundation' });
    const result = canAccessClient(ctx, 'dashboard');
    expect(result.allowed).toBe(true);
  });

  it('happy path: ADMIN with all flags true and core tier passes', () => {
    const ctx = makeCtx({ role: 'ADMIN', tier: 'core' });
    const result = canAccessClient(ctx, 'bookings');
    expect(result).toEqual({ allowed: true, reason: 'allowed' });
  });

  it('robustness: features with non-null flags and non-null registry work correctly', () => {
    const ctx = makeCtx({ role: 'RESIDENT', tier: 'foundation' });
    for (const feature of ['maintenance', 'events', 'chat', 'news', 'directory'] as const) {
      const result = canAccessClient(ctx, feature);
      expect(result.allowed).toBe(true);
    }
  });
});

describe('useGateContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null while usePageFlags is loading', () => {
    mockUsePageFlags.mockReturnValue({
      flags: null,
      isLoading: true,
      refetch: async () => {},
      error: null,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSession.mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useGateContext());
    expect(result.current).toBeNull();
  });

  it('returns null when usePageFlags has an error', () => {
    mockUsePageFlags.mockReturnValue({
      flags: null,
      isLoading: false,
      error: new Error('fetch failed'),
      refetch: async () => {},
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSession.mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useGateContext());
    expect(result.current).toBeNull();
  });

  it('returns null when flags are still not set after loading', () => {
    mockUsePageFlags.mockReturnValue({
      flags: null,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSession.mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useGateContext());
    expect(result.current).toBeNull();
  });

  it('returns ClientGateContext with role and flags when ready', () => {
    const flags = makeFlags();
    mockUsePageFlags.mockReturnValue({
      flags,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', role: 'ADMIN' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useGateContext());
    expect(result.current).toEqual({ role: 'ADMIN', flags });
  });

  it('defaults role to RESIDENT when session user has no role property', () => {
    const flags = makeFlags();
    mockUsePageFlags.mockReturnValue({
      flags,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useGateContext());
    expect(result.current).toEqual({ role: 'RESIDENT', flags });
  });

  it('defaults role to RESIDENT when session data is null', () => {
    const flags = makeFlags();
    mockUsePageFlags.mockReturnValue({
      flags,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSession.mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useGateContext());
    expect(result.current).toEqual({ role: 'RESIDENT', flags });
  });
});

describe('useCanAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns conservative deny while context is null', () => {
    mockUsePageFlags.mockReturnValue({
      flags: null,
      isLoading: true,
      refetch: async () => {},
      error: null,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSession.mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useCanAccess('bookings'));
    expect(result.current).toEqual({ allowed: false, reason: 'role' });
  });

  it('delegates to canAccessClient when context is resolved', () => {
    const flags = makeFlags({ bookings: false });
    mockUsePageFlags.mockReturnValue({
      flags,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', role: 'RESIDENT' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useCanAccess('bookings'));
    expect(result.current).toEqual({ allowed: false, reason: 'flag' });
  });

  it('allows when context resolved and flag is true', () => {
    const flags = makeFlags({ bookings: true });
    mockUsePageFlags.mockReturnValue({
      flags,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', role: 'RESIDENT' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useCanAccess('bookings'));
    expect(result.current).toEqual({ allowed: true, reason: 'allowed' });
  });
});

describe('GateGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loadingFallback when context is null (loading)', () => {
    mockUsePageFlags.mockReturnValue({
      flags: null,
      isLoading: true,
      refetch: async () => {},
      error: null,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSession.mockReturnValue({ data: null } as any);

    render(
      <GateGuard feature="events" loadingFallback={<span>Loading...</span>}>
        <div>Events content</div>
      </GateGuard>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Events content')).not.toBeInTheDocument();
  });

  it('renders children when access is allowed', () => {
    const flags = makeFlags();
    mockUsePageFlags.mockReturnValue({
      flags,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', role: 'RESIDENT' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <GateGuard feature="events">
        <div>Events content</div>
      </GateGuard>
    );

    expect(screen.getByText('Events content')).toBeInTheDocument();
  });

  it('renders fallback when access is denied', () => {
    const flags = makeFlags({ bookings: false });
    mockUsePageFlags.mockReturnValue({
      flags,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', role: 'RESIDENT' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <GateGuard feature="bookings" fallback={<span>Access denied</span>}>
        <div>Bookings content</div>
      </GateGuard>
    );

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Bookings content')).not.toBeInTheDocument();
  });

  it('renders nothing when denied and fallback is omitted (null default)', () => {
    const flags = makeFlags({ bookings: false });
    mockUsePageFlags.mockReturnValue({
      flags,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', role: 'RESIDENT' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { container } = render(
      <GateGuard feature="bookings">
        <div>Bookings content</div>
      </GateGuard>
    );

    expect(screen.queryByText('Bookings content')).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });

  it('uses render prop when provided (takes precedence over children/fallback)', () => {
    const flags = makeFlags();
    mockUsePageFlags.mockReturnValue({
      flags,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', role: 'RESIDENT' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <GateGuard feature="events" render={({ result }) => <span>Custom: {result.reason}</span>}>
        <div>Events content</div>
      </GateGuard>
    );

    expect(screen.getByText('Custom: allowed')).toBeInTheDocument();
    expect(screen.queryByText('Events content')).not.toBeInTheDocument();
  });

  it('render prop receives denied result when access is blocked', () => {
    const flags = makeFlags({ bookings: false });
    mockUsePageFlags.mockReturnValue({
      flags,
      isLoading: false,
      refetch: async () => {},
      error: null,
    });
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', role: 'RESIDENT' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <GateGuard
        feature="bookings"
        fallback={<span>Fallback</span>}
        render={({ result }) => <span>Reason: {result.reason}</span>}
      >
        <div>Bookings</div>
      </GateGuard>
    );

    expect(screen.getByText('Reason: flag')).toBeInTheDocument();
    expect(screen.queryByText('Fallback')).not.toBeInTheDocument();
    expect(screen.queryByText('Bookings')).not.toBeInTheDocument();
  });
});
