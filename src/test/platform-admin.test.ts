/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock server-only ──
vi.mock('server-only', () => ({}));

// ── Mock next/headers ──
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

// ── Hoisted mutable mocks (shared state for test-level overrides) ──
const apiServerMocks = vi.hoisted(() => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(null)),
    },
  },
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const tenantMocks = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  listTenants: vi.fn(() => Promise.resolve([{ id: 'tenant-1', name: 'Test Tenant' }])),
  createTenant: vi.fn((_data: unknown) =>
    Promise.resolve({ id: 'new-tenant', name: 'New Tenant' })
  ),
}));

// ── Mock @api/server (SINGLE consolidated call — covers ALL imports) ──
vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    // Auth
    auth: apiServerMocks.auth,

    // DB
    db: apiServerMocks.db,

    // Column name objects (Drizzle schema references)
    users: {
      id: 'id',
      role: 'role',
      isPlatformAdmin: 'isPlatformAdmin',
    },
    tenants: {
      id: 'id',
      ownerId: 'ownerId',
      name: 'name',
      slug: 'slug',
    },
    assistSessions: {
      id: 'id',
      tenantId: 'tenantId',
      staffId: 'staffId',
      scope: 'scope',
      expiresAt: 'expiresAt',
      isActive: 'isActive',
      notes: 'notes',
      createdAt: 'createdAt',
      revokedAt: 'revokedAt',
      revokedBy: 'revokedBy',
    },

    // Revalidation
    revalidateContent: vi.fn(),

    // Audit log
    writeAuditLog: vi.fn(),

    // ── API response helpers ──
    apiSuccess: (data: unknown, meta?: Record<string, unknown>, status = 200) =>
      NextResponse.json({ success: true, data, ...(meta && { meta }) }, { status }),
    apiError: (code: string, message: string, status: number) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }),
    apiCreated: (data: unknown) => NextResponse.json({ success: true, data }, { status: 201 }),
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ),
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message } }, { status: 403 }),
    apiNotFound: (message = 'Not found') =>
      NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message } }, { status: 404 }),
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ),
  };
});

// ── Mock @entities/tenant (SINGLE consolidated call — covers ALL imports) ──
vi.mock('@entities/tenant', () => ({
  withTenant: vi.fn(() =>
    Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' })
  ),
  requirePlatformAdmin: (request: any) => tenantMocks.requirePlatformAdmin(request),
  listTenants: () => tenantMocks.listTenants(),
  createTenant: (data: unknown) => tenantMocks.createTenant(data),
}));

// ── Mock @shared/lib ──
vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
}));

// ── Import route handlers after mocking ──
import { GET as TENANTS_GET, POST as TENANTS_POST } from '@/app/api/admin/platform/tenants/route';
import { GET as ASSIST_GET, POST as ASSIST_POST } from '@/app/api/admin/platform/assist/route';
import {
  DELETE as ASSIST_REVOKE,
  PATCH as ASSIST_EXTEND,
} from '@/app/api/admin/platform/assist/[id]/route';
import { auth } from '@api/server';

// ── Helpers ──
function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  const whereResult = Promise.resolve(result);
  const limitFn = vi.fn(() => Promise.resolve(result));
  const orderByFn = vi.fn(() => Promise.resolve(result));

  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => {
    const thenable = {
      then: (resolve: (v: unknown[]) => void, reject: (e: Error) => void) =>
        whereResult.then(resolve, reject),
      limit: limitFn,
      orderBy: orderByFn,
    };
    return thenable;
  });
  chain.limit = limitFn;
  chain.orderBy = orderByFn;

  return chain;
}

function makeUpdateChain(result: unknown[]) {
  const chain = {
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    returning: vi.fn(() => Promise.resolve(result)),
  };
  return chain;
}

// ── Tests ──
describe('Platform Admin Tenant API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    tenantMocks.requirePlatformAdmin.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/platform/tenants', () => {
    it('returns 403 for user with isPlatformAdmin: false', async () => {
      tenantMocks.requirePlatformAdmin.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Forbidden - Platform Admin access required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('http://localhost/api/admin/platform/tenants');
      const response = await TENANTS_GET(request as never);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Forbidden');
    });

    it('returns 200 for user with isPlatformAdmin: true', async () => {
      tenantMocks.requirePlatformAdmin.mockResolvedValue(null);

      const request = new Request('http://localhost/api/admin/platform/tenants');
      const response = await TENANTS_GET(request as never);

      expect(response.status).toBe(200);
      expect(tenantMocks.listTenants).toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/platform/tenants', () => {
    it('returns 403 for non-platform-admin', async () => {
      tenantMocks.requirePlatformAdmin.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('http://localhost/api/admin/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Tenant', slug: 'new-tenant' }),
      });

      const response = await TENANTS_POST(request as never);
      expect(response.status).toBe(403);
    });

    it('creates tenant for platform admin', async () => {
      tenantMocks.requirePlatformAdmin.mockResolvedValue(null);

      const request = new Request('http://localhost/api/admin/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Tenant', slug: 'new-tenant' }),
      });

      const response = await TENANTS_POST(request as never);
      expect(response.status).toBe(201);
      expect(tenantMocks.createTenant).toHaveBeenCalled();
    });
  });
});

describe('Platform Admin Assist API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/admin/platform/assist', () => {
    it('creates AssistSession with correct expiry', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'platform-admin' } as any,
      } as any);

      const userChain = makeSelectChain([{ isPlatformAdmin: true }]);
      const tenantChain = makeSelectChain([{ id: 'tenant-1' }]);
      const insertChain = {
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: 'assist-1',
                tenantId: 'tenant-1',
                staffId: 'platform-admin',
                scope: 'metadata',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            ])
          ),
        })),
      };

      let callCount = 0;
      apiServerMocks.db.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return userChain;
        return tenantChain;
      });
      apiServerMocks.db.insert.mockImplementation(() => insertChain);

      const request = new Request('http://localhost/api/admin/platform/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-1' }),
      });

      const response = await ASSIST_POST(request as never);
      expect(response.status).toBe(201);
    });

    it('returns 403 for non-platform-admin creating assist session', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'regular-user' } as any,
      } as any);

      const userChain = makeSelectChain([{ isPlatformAdmin: false }]);
      apiServerMocks.db.select.mockImplementation(() => userChain);

      const request = new Request('http://localhost/api/admin/platform/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-1' }),
      });

      const response = await ASSIST_POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it('returns 400 if tenantId is missing', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'platform-admin' } as any,
      } as any);

      const userChain = makeSelectChain([{ isPlatformAdmin: true }]);
      apiServerMocks.db.select.mockImplementation(() => userChain);

      const request = new Request('http://localhost/api/admin/platform/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await ASSIST_POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toBe('tenantId is required');
    });

    it('returns 404 if tenant does not exist', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'platform-admin' } as any,
      } as any);

      const userChain = makeSelectChain([{ isPlatformAdmin: true }]);
      const tenantChain = makeSelectChain([]);

      let callCount = 0;
      apiServerMocks.db.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return userChain;
        return tenantChain;
      });

      const request = new Request('http://localhost/api/admin/platform/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'nonexistent' }),
      });

      const response = await ASSIST_POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.message).toBe('Tenant not found');
    });
  });

  describe('DELETE /api/admin/platform/assist/[id] (revoke)', () => {
    it('returns 404 for non-existent assist session', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'platform-admin' } as any,
      } as any);

      const sessionChain = makeSelectChain([]);
      apiServerMocks.db.select.mockImplementation(() => sessionChain);

      const params = Promise.resolve({ id: 'nonexistent' });
      const request = new Request('http://localhost/api/admin/platform/assist/nonexistent', {
        method: 'DELETE',
      });

      const response = await ASSIST_REVOKE(request as never, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it('returns 400 for already revoked session', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'platform-admin' } as any,
      } as any);

      const sessionChain = makeSelectChain([
        {
          id: 'assist-1',
          tenantId: 'tenant-1',
          isActive: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);
      apiServerMocks.db.select.mockImplementation(() => sessionChain);

      const params = Promise.resolve({ id: 'assist-1' });
      const request = new Request('http://localhost/api/admin/platform/assist/assist-1', {
        method: 'DELETE',
      });

      const response = await ASSIST_REVOKE(request as never, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('already revoked');
    });
  });

  describe('Expired AssistSession rejection', () => {
    it('expired AssistSession is not returned in active list', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'platform-admin' } as any,
      } as any);

      const userChain = makeSelectChain([{ isPlatformAdmin: true }]);
      const sessionChain = makeSelectChain([]);

      let callCount = 0;
      apiServerMocks.db.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return userChain;
        return sessionChain;
      });

      const request = new Request('http://localhost/api/admin/platform/assist?tenantId=tenant-1');
      const response = await ASSIST_GET(request as never);

      expect(response.status).toBe(200);
    });
  });
});
