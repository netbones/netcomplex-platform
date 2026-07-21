/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  getRLSContext: vi.fn(),
  runWithRLS: vi.fn(),
  requireTenantRLS: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    requireAnyPermission: (perms: string[]) => mocks.requireAnyPermission(perms),
    getRLSContext: (request: any) => mocks.getRLSContext(request),
    runWithRLS: (ctx: any, fn: any) => mocks.runWithRLS(ctx, fn),
    maintenanceRequests: {
      id: 'id',
      tenantId: 'tenantId',
      userId: 'userId',
      status: 'status',
      category: 'category',
      priority: 'priority',
      description: 'description',
      ticketNumber: 'ticketNumber',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      completedAt: 'completedAt',
      scheduledDate: 'scheduledDate',
    },
    users: {
      id: 'id',
      tenantId: 'tenantId',
      name: 'name',
      email: 'email',
      role: 'role',
      createdAt: 'createdAt',
    },
    contents: {
      id: 'id',
      tenantId: 'tenantId',
      authorId: 'authorId',
      title: 'title',
      category: 'category',
      published: 'published',
      updatedAt: 'updatedAt',
    },
    surveys: {
      id: 'id',
      tenantId: 'tenantId',
      title: 'title',
      status: 'status',
      endDate: 'endDate',
      updatedAt: 'updatedAt',
    },
    events: {
      id: 'id',
      tenantId: 'tenantId',
      title: 'title',
      date: 'date',
      location: 'location',
      updatedAt: 'updatedAt',
    },
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    requireTenantRLS: (request: any) => mocks.requireTenantRLS(request),
  };
});

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { GET } from '@/app/api/admin/activity/route';

const DEFAULT_RLS_CTX = {
  userId: 'user-1',
  tenantId: 'test-tenant-id',
  role: 'ADMIN',
  isPlatformAdmin: false,
};

function makeActivityRequest(url: string): any {
  const req = new Request(url);
  Object.defineProperty(req, 'nextUrl', {
    value: new URL(url),
    writable: false,
    configurable: true,
  });
  return req;
}

describe('GET /api/admin/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAnyPermission.mockResolvedValue(null);
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX });
    mocks.requireTenantRLS.mockImplementation(async (request: any) => {
      const ctx = await mocks.getRLSContext(request);
      if (!ctx) return { ok: false as const, response: new Response('', { status: 401 }) };
      return { ok: true as const, ctx, tenantId: ctx.tenantId };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 403 when permission check fails', async () => {
    mocks.requireAnyPermission.mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const res = await GET(makeActivityRequest('http://localhost/api/admin/activity'));
    expect(res.status).toBe(403);
  });

  it('returns 401 without RLS context', async () => {
    mocks.getRLSContext.mockResolvedValue(null);
    const res = await GET(makeActivityRequest('http://localhost/api/admin/activity'));
    expect(res.status).toBe(401);
  });

  it('returns activity feed from all domains', async () => {
    const maintenanceRows = [
      {
        id: 'm1',
        action: 'submitted',
        resourceLabel: 'Leak',
        actorId: 'u1',
        createdAt: new Date('2026-06-20T10:00:00Z'),
        metadata: '{}',
      },
    ];
    const userRows = [
      {
        id: 'u2',
        action: 'joined',
        resourceLabel: 'Bob',
        actorId: 'u2',
        createdAt: new Date('2026-06-19T10:00:00Z'),
        metadata: '{}',
      },
    ];
    const contentRows = [
      {
        id: 'c1',
        action: 'published',
        resourceLabel: 'Welcome Post',
        actorId: 'u1',
        createdAt: new Date('2026-06-18T10:00:00Z'),
        metadata: '{}',
      },
    ];

    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => {
      const tx = { select: vi.fn() };
      tx.select
        .mockReturnValueOnce(makeSelectChain(maintenanceRows))
        .mockReturnValueOnce(makeSelectChain(userRows))
        .mockReturnValueOnce(makeSelectChain(contentRows))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));
      tx.select.mockReturnValue(
        makeSelectChain([
          { id: 'u1', name: 'Alice' },
          { id: 'u2', name: 'Bob' },
        ])
      );
      return fn(tx);
    });

    const res = await GET(
      makeActivityRequest('http://localhost/api/admin/activity?domain=all&limit=10')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.nextCursor).toBeDefined();
    expect(body.data.items[0].actorName).toBeDefined();
  });

  it('filters by specific domain', async () => {
    const maintenanceRows = [
      {
        id: 'm1',
        action: 'submitted',
        resourceLabel: 'Leak',
        actorId: 'u1',
        createdAt: new Date('2026-06-20T10:00:00Z'),
        metadata: '{}',
      },
    ];

    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => {
      const tx = { select: vi.fn() };
      tx.select.mockReturnValueOnce(makeSelectChain(maintenanceRows));
      tx.select.mockReturnValue(makeSelectChain([]));
      return fn(tx);
    });

    const res = await GET(
      makeActivityRequest('http://localhost/api/admin/activity?domain=maintenance&limit=10')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].domain).toBe('maintenance');
  });

  it('uses cursor for pagination', async () => {
    const rows = Array.from({ length: 2 }, (_, i) => ({
      id: `m${i}`,
      action: 'submitted',
      resourceLabel: `Issue ${i}`,
      actorId: 'u1',
      createdAt: new Date(`2026-06-${20 - i}T10:00:00Z`),
      metadata: '{}',
    }));

    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => {
      const tx = { select: vi.fn() };
      tx.select
        .mockReturnValueOnce(makeSelectChain(rows))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));
      tx.select.mockReturnValue(makeSelectChain([{ id: 'u1', name: 'Alice' }]));
      return fn(tx);
    });

    const cursor = encodeURIComponent('2026-06-19T10:00:00.000Z');
    const res = await GET(
      makeActivityRequest(`http://localhost/api/admin/activity?domain=all&limit=2&cursor=${cursor}`)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toBeDefined();
  });

  it('respects limit (max 50)', async () => {
    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => {
      const tx = { select: vi.fn() };
      tx.select.mockReturnValue(makeSelectChain([]));
      return fn(tx);
    });

    const res = await GET(makeActivityRequest('http://localhost/api/admin/activity?limit=100'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toEqual([]);
  });

  it('platform admin can view other tenant activity', async () => {
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX, isPlatformAdmin: true });
    const rows = [
      {
        id: 'm1',
        action: 'submitted',
        resourceLabel: 'Leak',
        actorId: 'u1',
        createdAt: new Date('2026-06-20T10:00:00Z'),
        metadata: '{}',
      },
    ];

    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => {
      const tx = { select: vi.fn() };
      tx.select
        .mockReturnValueOnce(makeSelectChain(rows))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));
      tx.select.mockReturnValue(makeSelectChain([]));
      return fn(tx);
    });

    const res = await GET(
      makeActivityRequest(
        'http://localhost/api/admin/activity?domain=all&limit=5&tenantId=other-tenant'
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toBeDefined();
  });

  it('handles error', async () => {
    mocks.getRLSContext.mockRejectedValueOnce(new Error('DB error'));
    const res = await GET(makeActivityRequest('http://localhost/api/admin/activity'));
    expect(res.status).toBe(500);
  });
});
