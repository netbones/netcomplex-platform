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
  requireAnyPermission: vi.fn(),
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    users: { id: 'id', tenantId: 'tenantId', name: 'name', email: 'email', role: 'role', createdAt: 'createdAt' },
    sessions: { id: 'id', userId: 'userId', tenantId: 'tenantId', expiresAt: 'expiresAt' },
    now: () => new Date(),
    db: mocks.dbMock,
    requireAnyPermission: (perms: string[]) => mocks.requireAnyPermission(perms),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message } }, { status: 401 }) as any,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message } }, { status: 403 }) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 }) as any,
    withErrorHandler: (handler: any) => handler,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { GET as HEALTH_GET } from '@/app/api/admin/system/health/route';

describe('GET /api/admin/system/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAnyPermission.mockResolvedValue(null);
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.transaction.mockImplementation(async (fn: any) => fn(mocks.dbMock));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when requireAnyPermission returns auth error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mocks.requireAnyPermission.mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await HEALTH_GET(new Request('http://localhost/api/admin/system/health'));

    expect(res.status).toBe(401);
  });

  it('returns 403 when requireAnyPermission returns forbidden', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mocks.requireAnyPermission.mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await HEALTH_GET(new Request('http://localhost/api/admin/system/health'));

    expect(res.status).toBe(403);
  });

  it('returns health status with user and active-session counts', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ count: 10 }]))
      .mockReturnValueOnce(
        makeSelectChain([{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u1' }]) // duplicate to test Set dedup
      );

    const res = await HEALTH_GET(new Request('http://localhost/api/admin/system/health'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data).toEqual({
      db: 'connected',
      tenantId: 'test-tenant-id',
      tenantName: 'test-tenant-id',
      totalUsers: 10,
      activeUsers: 2,
    });
  });

  it('returns 500 when db throws an error', async () => {
    mocks.dbMock.select.mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    const res = await HEALTH_GET(new Request('http://localhost/api/admin/system/health'));

    expect(res.status).toBe(500);
  });
});
