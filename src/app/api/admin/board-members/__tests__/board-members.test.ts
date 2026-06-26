import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  rlsCtx: null as { tenantId: string; userId: string; role: string } | null,
  txMock: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
  withTenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test' },
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.withTenantResult),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getRLSContext: () => Promise.resolve(mocks.rlsCtx),
    runWithRLS: (_ctx: unknown, fn: (tx: unknown) => unknown) => fn(mocks.txMock),
    users: {},
    withErrorHandler:
      (fn: (...args: unknown[]) => unknown) =>
      (...args: unknown[]) =>
        fn(...args),
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message } },
        { status: 403 }
      ) as unknown as Response,
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json(
        { success: true, data },
        { status, ...(init || {}) }
      ) as unknown as Response,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as unknown as Response,
  };
});

import { GET } from '@/app/api/admin/board-members/route';

describe('GET /api/admin/board-members', () => {
  beforeEach(() => {
    mocks.rlsCtx = null;
    mocks.withTenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test' };
    mocks.txMock.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without RLS context', async () => {
    const res = await GET(new Request('http://localhost:3000'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin roles', async () => {
    mocks.rlsCtx = { tenantId: 't1', userId: 'u1', role: 'RESIDENT' };
    const res = await GET(new Request('http://localhost:3000'));
    expect(res.status).toBe(403);
  });

  it('returns 403 for COMMITTEE role', async () => {
    mocks.rlsCtx = { tenantId: 't1', userId: 'u1', role: 'COMMITTEE' };
    const res = await GET(new Request('http://localhost:3000'));
    expect(res.status).toBe(403);
  });

  it('returns board members for ADMIN role', async () => {
    mocks.rlsCtx = { tenantId: 't1', userId: 'u1', role: 'ADMIN' };
    const rows = [
      { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'BOARD' },
      { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'ADMIN' },
    ];
    mocks.txMock.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(rows)),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;
    const res = await GET(new Request('http://localhost:3000'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].name).toBe('Alice');
  });

  it('returns board members for BOARD role', async () => {
    mocks.rlsCtx = { tenantId: 't1', userId: 'u1', role: 'BOARD' };
    mocks.txMock.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    }));
    const res = await GET(new Request('http://localhost:3000'));
    expect(res.status).toBe(200);
  });
});
