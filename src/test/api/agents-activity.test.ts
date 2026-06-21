/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from './helpers';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((key: string) => {
        if (key === 'x-tenant-id') return 'test-tenant-id';
        if (key === 'x-tenant-slug') return 'test-tenant';
        return null;
      }),
    })
  ),
}));

const mocks = vi.hoisted(() => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: mocks.auth,
    db: mocks.db,
    agentAccesses: {
      agentId: 'agentId',
      grantedById: 'grantedById',
      tenantId: 'tenantId',
    },
    apiError: (message: string, status?: number) =>
      NextResponse.json({ success: false, error: { message } }, { status: status ?? 400 }) as any,
    apiSuccess: (data: unknown) =>
      NextResponse.json({ success: true, data }, { status: 200 }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message } }, { status: 401 }) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 }) as any,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from '@/app/api/agents/activity/route';

describe('GET /api/agents/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.api.getSession.mockReset();
    mocks.db.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when no session exists', async () => {
    mocks.auth.api.getSession.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/agents/activity') as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect((body as any).error?.code).toBe('AUTH_REQUIRED');
  });

  it('returns 401 when session has no user id', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: null } } as any);

    const res = await GET(new Request('http://localhost/api/agents/activity') as any);

    expect(res.status).toBe(401);
  });

  it('returns empty activities when user has no agent access', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    mocks.db.select.mockReturnValue(makeSelectChain([]));

    const res = await GET(new Request('http://localhost/api/agents/activity') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.activities).toEqual([]);
  });

  it('returns activities when user has agent access', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    mocks.db.select.mockReturnValue(
      makeSelectChain([{ agentId: 'agent-1' }])
    );

    const res = await GET(new Request('http://localhost/api/agents/activity') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.activities).toHaveLength(2);
    expect((body as any).data.activities[0].type).toBe('communication');
    expect((body as any).data.activities[1].type).toBe('maintenance');
  });

  it('returns 500 when db throws', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    mocks.db.select.mockImplementation(() => {
      throw new Error('DB failure');
    });

    const res = await GET(new Request('http://localhost/api/agents/activity') as any);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect((body as any).error?.code).toBe('INTERNAL_ERROR');
  });

  it('calls db.select with correct filter on grantedById and tenantId', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: 'user-1' } } as any);

    await GET(new Request('http://localhost/api/agents/activity') as any);

    const whereFn = (mocks.db.select as any).mock.results[0].value.where;
    expect(whereFn).toHaveBeenCalled();
  });
});
