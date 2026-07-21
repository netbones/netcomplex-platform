/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

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
  getRLSContext: vi.fn(),
  runWithRLS: vi.fn(),
  requireTenantRLS: vi.fn(),
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
    users: {
      id: 'id',
      tenantId: 'tenantId',
      name: 'name',
      email: 'email',
      role: 'role',
      createdAt: 'createdAt',
      isPlatformAdmin: 'isPlatformAdmin',
    },
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
    groupMembershipRequests: { id: 'id', tenantId: 'tenantId', status: 'status' },
    surveys: {
      id: 'id',
      tenantId: 'tenantId',
      title: 'title',
      status: 'status',
      endDate: 'endDate',
      updatedAt: 'updatedAt',
    },
    announcements: { id: 'id', tenantId: 'tenantId', expiresAt: 'expiresAt' },
    contents: {
      id: 'id',
      tenantId: 'tenantId',
      authorId: 'authorId',
      title: 'title',
      category: 'category',
      published: 'published',
      updatedAt: 'updatedAt',
    },
    competitions: { id: 'id', tenantId: 'tenantId', status: 'status' },
    events: {
      id: 'id',
      tenantId: 'tenantId',
      title: 'title',
      date: 'date',
      location: 'location',
      updatedAt: 'updatedAt',
    },
    now: () => new Date(),
    requireAnyPermission: (perms: string[]) => mocks.requireAnyPermission(perms),
    getRLSContext: (request: any) => mocks.getRLSContext(request),
    runWithRLS: (ctx: any, fn: any) => mocks.runWithRLS(ctx, fn),
    requireTenantRLS: (request: any) => mocks.requireTenantRLS(request),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message } },
        { status: 403 }
      ) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
    withErrorHandler: (handler: any) => handler,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  isAdmin: (role: string | null | undefined) => {
    if (!role) return false;
    return ['ADMIN', 'BOARD'].includes(role);
  },
}));

import { GET as BOARD_MEMBERS_GET } from '@/app/api/admin/board-members/route';
import { GET as URGENCY_GET } from '@/app/api/admin/urgency/route';
import { GET as MAINTENANCE_STATS_GET } from '@/app/api/admin/maintenance-stats/route';

const DEFAULT_RLS_CTX = {
  userId: 'user-1',
  tenantId: 'test-tenant-id',
  role: 'ADMIN',
  isPlatformAdmin: false,
};

describe('Admin API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAnyPermission.mockResolvedValue(null);
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX });
    mocks.requireTenantRLS.mockImplementation(async (request: any) => {
      const ctx = await mocks.getRLSContext(request);
      if (!ctx) return { ok: false as const, response: new Response('', { status: 401 }) };
      return { ok: true as const, ctx, tenantId: ctx.tenantId };
    });
    mocks.runWithRLS.mockImplementation(async (_ctx: any, fn: any) => fn(mocks.dbMock));
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.transaction.mockImplementation(async (fn: any) => fn(mocks.dbMock));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/board-members', () => {
    it('returns 401 without RLS context', async () => {
      mocks.getRLSContext.mockResolvedValue(null);

      const res = await BOARD_MEMBERS_GET(new Request('http://localhost/api/admin/board-members'));

      expect(res.status).toBe(401);
    });

    it('returns 403 for non-board/admin role', async () => {
      mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX, role: 'RESIDENT' });

      const res = await BOARD_MEMBERS_GET(new Request('http://localhost/api/admin/board-members'));

      expect(res.status).toBe(403);
    });

    it('returns board members for ADMIN role', async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'BOARD' },
          { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'ADMIN' },
        ])
      );

      const res = await BOARD_MEMBERS_GET(new Request('http://localhost/api/admin/board-members'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toHaveLength(2);
      expect((body as any).data[0].name).toBe('Alice');
    });
  });

  describe('GET /api/admin/urgency', () => {
    it('returns 401 without RLS context', async () => {
      mocks.getRLSContext.mockResolvedValue(null);

      const res = await URGENCY_GET(new Request('http://localhost/api/admin/urgency'));

      expect(res.status).toBe(401);
    });

    it('returns 403 when permission check fails', async () => {
      mocks.requireAnyPermission.mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await URGENCY_GET(new Request('http://localhost/api/admin/urgency'));

      expect(res.status).toBe(403);
    });

    it('returns urgency dashboard counts', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ count: 5 }]));

      const res = await URGENCY_GET(new Request('http://localhost/api/admin/urgency'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.commandBar).toBeDefined();
      expect((body as any).data.commandBar.openMaintenance).toBe(5);
      expect((body as any).data.domainBadges).toBeDefined();
    });
  });

  describe('GET /api/admin/maintenance-stats', () => {
    it('returns 401 without RLS context', async () => {
      mocks.getRLSContext.mockResolvedValue(null);

      const res = await MAINTENANCE_STATS_GET(
        new Request('http://localhost/api/admin/maintenance-stats')
      );

      expect(res.status).toBe(401);
    });

    it('returns 403 for non-board/admin role', async () => {
      mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX, role: 'RESIDENT' });

      const res = await MAINTENANCE_STATS_GET(
        new Request('http://localhost/api/admin/maintenance-stats')
      );

      expect(res.status).toBe(403);
    });

    it('returns maintenance stats overview', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ count: 3 }]));

      const res = await MAINTENANCE_STATS_GET(
        new Request('http://localhost/api/admin/maintenance-stats')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.overview).toBeDefined();
      expect((body as any).data.byStatus).toBeDefined();
      expect((body as any).data.byPriority).toBeDefined();
      expect((body as any).data.byCategory).toBeDefined();
      expect((body as any).data.trend).toBeDefined();
    });
  });
});
