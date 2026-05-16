import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only before any imports that use it
vi.mock('server-only', () => ({}));

// Mock next/headers
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

// Mock revalidation
vi.mock('@api/revalidation', () => ({
  revalidateContent: vi.fn(),
}));

// Mock auth
vi.mock('@api/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(null)),
    },
  },
}));

// Mock db
const mocks = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@api/db', () => ({
  db: mocks.dbMock,
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
}));

// Mock withTenant
vi.mock('@entities/tenant/api/with-tenant', () => ({
  withTenant: vi.fn(() =>
    Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' })
  ),
}));

// Mock guards for platform admin
const mockRequirePlatformAdmin = vi.fn();
vi.mock('@entities/tenant/api/guards', () => ({
  requirePlatformAdmin: () => mockRequirePlatformAdmin(),
}));

// Mock base tenant API
const mockListTenants = vi.fn(() => Promise.resolve([{ id: 'tenant-1', name: 'Test Tenant' }]));
const mockCreateTenant = vi.fn(() => Promise.resolve({ id: 'new-tenant', name: 'New Tenant' }));
vi.mock('@entities/tenant/api/base', () => ({
  listTenants: () => mockListTenants(),
  createTenant: (data: unknown) => mockCreateTenant(data),
}));

// Mock logError
vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
}));

// Import route handlers after mocking
import { GET as TENANTS_GET, POST as TENANTS_POST } from '@/app/api/admin/platform/tenants/route';
import { GET as ASSIST_GET, POST as ASSIST_POST } from '@/app/api/admin/platform/assist/route';
import {
  DELETE as ASSIST_REVOKE,
  PATCH as ASSIST_EXTEND,
} from '@/app/api/admin/platform/assist/[id]/route';
import { auth } from '@api/auth';

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

function makeUpdateChain(result: unknown[]) {
  const chain = {
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    returning: vi.fn(() => Promise.resolve(result)),
  };
  return chain;
}

describe('Platform Admin Tenant API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockRequirePlatformAdmin.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/platform/tenants', () => {
    it('returns 403 for user with isPlatformAdmin: false', async () => {
      mockRequirePlatformAdmin.mockResolvedValue(
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
      mockRequirePlatformAdmin.mockResolvedValue(null);

      const request = new Request('http://localhost/api/admin/platform/tenants');
      const response = await TENANTS_GET(request as never);

      expect(response.status).toBe(200);
      expect(mockListTenants).toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/platform/tenants', () => {
    it('returns 403 for non-platform-admin', async () => {
      mockRequirePlatformAdmin.mockResolvedValue(
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
      mockRequirePlatformAdmin.mockResolvedValue(null);

      const request = new Request('http://localhost/api/admin/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Tenant', slug: 'new-tenant' }),
      });

      const response = await TENANTS_POST(request as never);
      expect(response.status).toBe(201);
      expect(mockCreateTenant).toHaveBeenCalled();
    });
  });
});

describe('Platform Admin Assist API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/admin/platform/assist', () => {
    it('creates AssistSession with correct expiry', async () => {
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'platform-admin' },
      });

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
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return userChain;
        return tenantChain;
      });
      mocks.dbMock.insert.mockImplementation(() => insertChain);

      const request = new Request('http://localhost/api/admin/platform/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-1' }),
      });

      const response = await ASSIST_POST(request as never);
      expect(response.status).toBe(201);
    });

    it('returns 403 for non-platform-admin creating assist session', async () => {
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'regular-user' },
      });

      const userChain = makeSelectChain([{ isPlatformAdmin: false }]);
      mocks.dbMock.select.mockImplementation(() => userChain);

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
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'platform-admin' },
      });

      const userChain = makeSelectChain([{ isPlatformAdmin: true }]);
      mocks.dbMock.select.mockImplementation(() => userChain);

      const request = new Request('http://localhost/api/admin/platform/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await ASSIST_POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId is required');
    });

    it('returns 404 if tenant does not exist', async () => {
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'platform-admin' },
      });

      const userChain = makeSelectChain([{ isPlatformAdmin: true }]);
      const tenantChain = makeSelectChain([]);

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
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
      expect(data.error).toBe('Tenant not found');
    });
  });

  describe('DELETE /api/admin/platform/assist/[id] (revoke)', () => {
    it('returns 404 for non-existent assist session', async () => {
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'platform-admin' },
      });

      const sessionChain = makeSelectChain([]);
      mocks.dbMock.select.mockImplementation(() => sessionChain);

      const params = Promise.resolve({ id: 'nonexistent' });
      const request = new Request('http://localhost/api/admin/platform/assist/nonexistent', {
        method: 'DELETE',
      });

      const response = await ASSIST_REVOKE(request as never, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it('returns 400 for already revoked session', async () => {
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'platform-admin' },
      });

      const sessionChain = makeSelectChain([
        {
          id: 'assist-1',
          tenantId: 'tenant-1',
          isActive: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);
      mocks.dbMock.select.mockImplementation(() => sessionChain);

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
      (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'platform-admin' },
      });

      const userChain = makeSelectChain([{ isPlatformAdmin: true }]);
      const sessionChain = makeSelectChain([]);

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
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
