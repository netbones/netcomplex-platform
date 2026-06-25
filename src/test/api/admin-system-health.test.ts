import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  requireAnyPermissionResult: null as Response | null,
  sessionResult: null as { userId: string; role: string } | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectChain: {} as any,
  withTenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test' },
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.withTenantResult),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    requireAnyPermission: () => Promise.resolve(mocks.requireAnyPermissionResult),
    db: {
      select: vi.fn(() => mocks.selectChain),
    },
    users: {},
    sessions: {},
    now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json(
        { success: true, data },
        { status, ...(init || {}) }
      ) as unknown as Response,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as unknown as Response,
  };
});

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  };
});

import { GET } from '@/app/api/admin/system/health/route';

describe('GET /api/admin/system/health', () => {
  beforeEach(() => {
    mocks.requireAnyPermissionResult = null;
    mocks.withTenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test' };
    mocks.selectChain = {
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 10 }])),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      })),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401/403 when permission check fails', async () => {
    const { NextResponse } = await import('next/server');
    mocks.requireAnyPermissionResult = NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
      { status: 403 }
    ) as unknown as Response;

    const res = await GET(new Request('http://localhost:3000'));
    expect(res.status).toBe(403);
  });

  it('returns health data when authorized', async () => {
    mocks.selectChain = {
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 25 }])),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() =>
            Promise.resolve([{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u1' }])
          ),
        })),
      })),
    };

    const res = await GET(new Request('http://localhost:3000'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.db).toBe('connected');
    expect(body.data.totalUsers).toBe(25);
    expect(body.data.activeUsers).toBe(2);
    expect(body.data.tenantId).toBe('test-tenant-id');
  });

  it('handles zero users gracefully', async () => {
    mocks.selectChain = {
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      })),
    };

    const res = await GET(new Request('http://localhost:3000'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.totalUsers).toBe(0);
    expect(body.data.activeUsers).toBe(0);
  });

  it('handles database error gracefully', async () => {
    mocks.selectChain = {
      from: vi.fn(() => {
        throw new Error('DB error');
      }),
    };

    const res = await GET(new Request('http://localhost:3000'));
    expect(res.status).toBe(500);
  });

  it('returns count null from query when no rows', async () => {
    mocks.selectChain = {
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: null }])),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      })),
    };

    const res = await GET(new Request('http://localhost:3000'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.totalUsers).toBe(0);
  });
});
