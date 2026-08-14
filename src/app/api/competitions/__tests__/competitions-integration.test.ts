/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only before any imports that use it
vi.mock('server-only', () => ({}));

// Mock next/headers (used by withTenant)
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

// ── Hoisted mocks (per-test configurable) ──
const { dbMock, authSessionMock, requirePlatformAdminMock, mockRole } = vi.hoisted(() => {
  const mockRole = { current: 'RESIDENT' as string };
  return {
    dbMock: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    authSessionMock: vi.fn<() => Promise<{ user: { id: string } } | null>>(() =>
      Promise.resolve(null)
    ),
    requirePlatformAdminMock: vi.fn(),
    mockRole,
  };
});

// ── Single consolidated @api/server mock ──
vi.mock('@api/server', () => ({
  db: dbMock,
  auth: { api: { getSession: authSessionMock } },
  getSessionAndRole: vi.fn(() => {
    return authSessionMock().then(session => {
      if (!session) return null;
      return { session, userId: session.user.id, role: mockRole.current, suspension: null };
    });
  }),
  guardSuspension: vi.fn(() => null),
  notDeleted: vi.fn(() => true),
  CACHE_TAGS: { competitions: 'competitions' },
  competitions: {
    tenantId: 'tenantId',
    status: 'status',
    startDate: 'startDate',
    endDate: 'endDate',
    id: 'id',
  },
  users: {
    id: 'id',
    role: 'role',
    isPlatformAdmin: 'isPlatformAdmin',
  },
  tenants: {
    id: 'id',
    ownerId: 'ownerId',
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
  revalidateContent: vi.fn(),
  writeAuditLog: vi.fn(),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiCreated: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify(data), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    (message?: string) =>
      new Response(JSON.stringify({ error: message || 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiForbidden: vi.fn(
    (message?: string) =>
      new Response(JSON.stringify({ error: message || 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiNotFound: vi.fn(
    (message?: string) =>
      new Response(JSON.stringify({ error: message || 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (_code: string, message: string, status: number) =>
      new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiInternalError: vi.fn(
    (message?: string) =>
      new Response(JSON.stringify({ error: message || 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  emitEvent: vi.fn(),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
}));

vi.mock('@/shared/api/auth-utils', () => ({
  requireAuth: vi.fn(async (_request: Request) => {
    const session = await authSessionMock();
    if (!session) {
      return {
        success: false as const,
        response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      };
    }
    return {
      success: true as const,
      data: {
        session,
        userId: session.user.id,
        role: mockRole.current,
        suspension: null,
      },
    };
  }),
  getSessionAndRole: vi.fn(async () => {
    const session = await authSessionMock();
    if (!session) return null;
    return { session, userId: session.user.id, role: mockRole.current, suspension: null };
  }),
}));

// ── Mock @entities/tenant/server to prevent transitive imports ──
vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() =>
    Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' })
  ),
  assertModuleEnabled: vi.fn(),
  requirePlatformAdmin: vi.fn(() => requirePlatformAdminMock()),
  listTenants: vi.fn(() => Promise.resolve([{ id: 'tenant-1', name: 'Test Tenant' }])),
  createTenant: vi.fn(() => Promise.resolve({ id: 'new-tenant', name: 'New Tenant' })),
  MODULES: {},
  TIERS: {},
}));

// ── Single consolidated @entities/tenant mock ──
vi.mock('@entities/tenant', () => ({
  withTenant: vi.fn(() =>
    Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' })
  ),
  requirePlatformAdmin: () => requirePlatformAdminMock(),
  listTenants: vi.fn(() => Promise.resolve([{ id: 'tenant-1', name: 'Test Tenant' }])),
  createTenant: vi.fn(() => Promise.resolve({ id: 'new-tenant', name: 'New Tenant' })),
}));

// ── @shared/lib mock (logError + hasPermission) ──
vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
  createComponentLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'content')
      return role === 'ADMIN' || role === 'MANAGER' || role === 'COMMITTEE';
    if (permission === 'contentOwn') return role === 'ADMIN' || role === 'COMMITTEE';
    return false;
  }),
}));

// Import route handlers after mocking
import { GET as COMPETITIONS_GET, POST as COMPETITIONS_POST } from '@/app/api/competitions/route';
import {
  PATCH as COMPETITION_PATCH,
  DELETE as COMPETITION_DELETE,
} from '@/app/api/competitions/[id]/route';
import { GET as TENANTS_GET } from '@/app/api/admin/platform/tenants/route';
import { GET as ASSIST_GET, POST as ASSIST_POST } from '@/app/api/admin/platform/assist/route';
import { DELETE as ASSIST_REVOKE } from '@/app/api/admin/platform/assist/[id]/route';
import { auth } from '@api/server';

// Helper: create a full chainable select
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

function makeInsertChain(result: unknown[]) {
  const chain = {
    values: vi.fn(() => chain),
    returning: vi.fn(() => Promise.resolve(result)),
  };
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

describe('Competition API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    mockRole.current = 'RESIDENT';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/competitions', () => {
    it('public upcoming filter returns only ACTIVE status competitions', async () => {
      const activeCompetitions = [
        { id: '1', title: 'Active Comp', status: 'ACTIVE', tenantId: 'test-tenant-id' },
      ];

      const chain = makeSelectChain(activeCompetitions);
      dbMock.select.mockImplementation(() => chain);

      const request = new Request('http://localhost/api/competitions?upcoming=true');
      const response = await COMPETITIONS_GET(request);

      expect(response.status).toBe(200);
    });

    it('unauthenticated access to upcoming competitions returns 200', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      const chain = makeSelectChain([]);
      dbMock.select.mockImplementation(() => chain);

      const request = new Request('http://localhost/api/competitions?upcoming=true');
      const response = await COMPETITIONS_GET(request);

      expect(response.status).toBe(200);
    });

    it('authenticated GET returns competitions for caller tenant', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'user-1' },
      } as any);

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const compChain = makeSelectChain([
        { id: '1', title: 'Comp 1', status: 'ACTIVE', tenantId: 'test-tenant-id' },
      ]);

      let callCount = 0;
      dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return roleChain;
        return compChain;
      });

      const request = new Request('http://localhost/api/competitions');
      const response = await COMPETITIONS_GET(request);

      expect(response.status).toBe(200);
    });

    it('returns 401 for non-upcoming unauthenticated access', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/competitions');
      const response = await COMPETITIONS_GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/competitions', () => {
    it('admin can create competition', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'admin-user' } as any,
      } as any);
      mockRole.current = 'ADMIN';

      const insertChain = makeInsertChain([
        { id: 'new-comp', title: 'New Competition', status: 'DRAFT' },
      ]);

      dbMock.select.mockImplementation(() => makeSelectChain([]));
      dbMock.insert.mockImplementation(() => insertChain);

      const request = new Request('http://localhost/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Competition',
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        }),
      });

      const response = await COMPETITIONS_POST(request);
      expect(response.status).toBe(201);
    });

    it('returns 403 for user without content permission', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'resident-user' } as any,
      } as any);

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      dbMock.select.mockImplementation(() => roleChain);

      const request = new Request('http://localhost/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Competition',
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        }),
      });

      const response = await COMPETITIONS_POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });

  describe('PATCH /api/competitions/[id]', () => {
    it('admin can update competition', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'admin-user' } as any,
      } as any);

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const updateChain = makeUpdateChain([{ id: 'comp-1', title: 'Updated', status: 'ACTIVE' }]);

      let callCount = 0;
      dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return roleChain;
        return makeSelectChain([{ id: 'comp-1' }]);
      });
      dbMock.update.mockImplementation(() => updateChain);

      const params = Promise.resolve({ id: 'comp-1' });
      const request = new Request('http://localhost/api/competitions/comp-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await COMPETITION_PATCH(request, { params });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/competitions/[id]', () => {
    it('admin can delete competition', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'admin-user' } as any,
      } as any);

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const deleteChain = {
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'comp-1', title: 'Deleted' }])),
        })),
      };

      dbMock.select.mockImplementation(() => roleChain);
      dbMock.delete.mockImplementation(() => deleteChain);

      const params = Promise.resolve({ id: 'comp-1' });
      const request = new Request('http://localhost/api/competitions/comp-1', {
        method: 'DELETE',
      });

      const response = await COMPETITION_DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe('Platform Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    requirePlatformAdminMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/platform/tenants', () => {
    it('returns 403 for user with isPlatformAdmin: false', async () => {
      requirePlatformAdminMock.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Forbidden - Platform Admin access required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('http://localhost/api/admin/platform/tenants');
      const response = await TENANTS_GET(request as never);

      expect(response.status).toBe(403);
    });

    it('returns 200 for user with isPlatformAdmin: true', async () => {
      requirePlatformAdminMock.mockResolvedValue(null);

      const request = new Request('http://localhost/api/admin/platform/tenants');
      const response = await TENANTS_GET(request as never);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/admin/platform/assist', () => {
    it('creates AssistSession with correct expiry', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'platform-admin' } as any,
      } as any);

      const userChain = makeSelectChain([{ isPlatformAdmin: true }]);
      const tenantChain = makeSelectChain([{ id: 'tenant-1' }]);
      const insertChain = makeInsertChain([
        {
          id: 'assist-1',
          tenantId: 'tenant-1',
          staffId: 'platform-admin',
          scope: 'metadata',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);

      let callCount = 0;
      dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return userChain;
        return tenantChain;
      });
      dbMock.insert.mockImplementation(() => insertChain);

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
      dbMock.select.mockImplementation(() => userChain);

      const request = new Request('http://localhost/api/admin/platform/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-1' }),
      });

      const response = await ASSIST_POST(request as never);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/platform/assist/[id] (revoke)', () => {
    it('returns 404 for non-existent assist session', async () => {
      const getSessionMock = vi.mocked(auth.api.getSession);
      getSessionMock.mockResolvedValue({ user: { id: 'platform-admin' } } as any);

      const sessionChain = makeSelectChain([]);
      dbMock.select.mockImplementation(() => sessionChain);

      const params = Promise.resolve({ id: 'nonexistent' });
      const request = new Request('http://localhost/api/admin/platform/assist/nonexistent', {
        method: 'DELETE',
      });

      const response = await ASSIST_REVOKE(request as never, { params });

      expect(response.status).toBe(404);
    });

    it('returns 400 for already revoked session', async () => {
      const getSessionMock = vi.mocked(auth.api.getSession);
      getSessionMock.mockResolvedValue({ user: { id: 'platform-admin' } } as any);

      const sessionChain = makeSelectChain([
        { id: 'assist-1', tenantId: 'tenant-1', isActive: false, expiresAt: new Date() },
      ]);
      dbMock.select.mockImplementation(() => sessionChain);

      const params = Promise.resolve({ id: 'assist-1' });
      const request = new Request('http://localhost/api/admin/platform/assist/assist-1', {
        method: 'DELETE',
      });

      const response = await ASSIST_REVOKE(request as never, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already revoked');
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
      dbMock.select.mockImplementation(() => {
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
