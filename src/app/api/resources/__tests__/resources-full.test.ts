import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock is hoisted, so we need to use vi.hoisted for shared state
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

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

// Mock @api/server — single consolidated call with ALL exports the resource routes import
vi.mock('@api/server', () => {
  const jsonResponse = (data: unknown, status: number) => Response.json(data, { status });

  return {
    auth: {
      api: {
        getSession: () => Promise.resolve(mocks.sessionResult),
      },
    },
    db: mocks.dbMock,
    resources: {
      id: 'id',
      tenantId: 'tenantId',
      title: 'title',
      description: 'description',
      category: 'category',
      visibility: 'visibility',
      fileUrl: 'fileUrl',
      fileType: 'fileType',
      fileSize: 'fileSize',
      externalUrl: 'externalUrl',
      bodyContent: 'bodyContent',
      version: 'version',
      authorId: 'authorId',
      publishedAt: 'publishedAt',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    resourceVersions: {
      id: 'id',
      resourceId: 'resourceId',
      fileUrl: 'fileUrl',
      fileType: 'fileType',
      fileSize: 'fileSize',
      version: 'version',
      notes: 'notes',
      createdAt: 'createdAt',
    },
    users: {
      id: 'id',
      role: 'role',
    },
    households: {
      id: 'id',
      tenantId: 'tenantId',
    },
    profiles: {
      householdId: 'householdId',
      userId: 'userId',
    },
    revalidateContent: vi.fn(),
    apiSuccess: vi.fn(data => jsonResponse(data, 200)),
    apiCreated: vi.fn(data => jsonResponse(data, 201)),
    apiError: vi.fn((_code: string, message: string, status: number) =>
      jsonResponse({ error: message }, status)
    ),
    apiUnauthorized: vi.fn(() => jsonResponse({ error: 'Unauthorized' }, 401)),
    apiForbidden: vi.fn(() => jsonResponse({ error: 'Forbidden' }, 403)),
    apiNotFound: vi.fn((message?: string) => jsonResponse({ error: message || 'Not found' }, 404)),
    CACHE_TAGS: { resources: 'resources' },
    withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
    notDeleted: vi.fn((t: { deletedAt: string }) => ({ isNull: [t, 'deletedAt'] })),
    now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  };
});

// Mock withTenant
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

// Mock @shared/lib
vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'admin') return role === 'ADMIN';
    if (permission === 'content')
      return role === 'ADMIN' || role === 'MANAGER' || role === 'COMMITTEE' || role === 'BOARD';
    if (permission === 'contentOwn') return role === 'ADMIN' || role === 'COMMITTEE';
    return false;
  }),
}));

// Import route handlers after mocking
import { GET, POST } from '@/app/api/resources/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/resources/[id]/route';

// Helper: create a full chainable select that returns the given result when awaited
// The chain supports: select().from().where() -> Promise<result[]>
// Also: select().from().innerJoin().where().limit() -> Promise<result[]>
// Also: select().from().where().orderBy() -> Promise<result[]>
function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};

  // where() returns a thenable (Promise) for destructuring: const [x] = await db.select().from().where()
  const whereResult = Promise.resolve(result);
  // But also support chaining: .where().limit()
  const limitFn = vi.fn(() => Promise.resolve(result));
  const orderByFn = vi.fn(() => Promise.resolve(result));

  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => {
    // Return an object that is both thenable and chainable
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

function makeDeleteChain() {
  const chain = {
    where: vi.fn(() => Promise.resolve({})),
  };
  return chain;
}

describe('Resource API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/resources', () => {
    it('returns only resources matching caller visibility tier', async () => {
      const mockResources = [
        { id: '1', title: 'Public Doc', visibility: 'ALL_RESIDENTS', tenantId: 'test-tenant-id' },
      ];

      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      const ownershipChain = makeSelectChain([{ id: 'household-1' }]);
      const resourceChain = makeSelectChain(mockResources);

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return roleChain;
        if (callCount === 2) return ownershipChain;
        return resourceChain;
      });

      const request = new Request('http://localhost/api/resources');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('returns only resources for caller tenantId', async () => {
      const mockResources = [{ id: '1', title: 'Tenant Resource', tenantId: 'test-tenant-id' }];

      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const resourceChain = makeSelectChain(mockResources);

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return roleChain;
        return resourceChain;
      });

      const request = new Request('http://localhost/api/resources');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/resources', () => {
    it('sets tenantId from session and ignores tenantId in request body', async () => {
      const createdResource = {
        id: 'new-id',
        title: 'New Resource',
        tenantId: 'test-tenant-id',
      };

      mocks.sessionResult = { user: { id: 'admin-user' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const insertChain = makeInsertChain([createdResource]);

      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.dbMock.insert.mockImplementation(() => insertChain);

      const request = new Request('http://localhost/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Resource',
          category: 'GENERAL',
          tenantId: 'wrong-tenant-id',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mocks.dbMock.insert).toHaveBeenCalled();
    });

    it('returns 401 for unauthenticated user', async () => {
      mocks.sessionResult = null;

      const request = new Request('http://localhost/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', category: 'GENERAL' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 for user without content permission', async () => {
      mocks.sessionResult = { user: { id: 'resident-user' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const request = new Request('http://localhost/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', category: 'GENERAL' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('returns 400 for missing required fields', async () => {
      mocks.sessionResult = { user: { id: 'admin-user' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const request = new Request('http://localhost/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'No Category' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('GET /api/resources/[id]', () => {
    it('returns 404 for resource belonging to different tenant', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      const ownershipChain = makeSelectChain([]);
      const resourceChain = makeSelectChain([]);

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return roleChain;
        if (callCount === 2) return ownershipChain;
        return resourceChain;
      });

      const params = Promise.resolve({ id: 'other-tenant-resource' });
      const request = new Request('http://localhost/api/resources/other-tenant-resource');

      const response = await GET_BY_ID(request, { params });

      expect(response.status).toBe(404);
    });

    it('returns 403 for RESIDENT accessing BOARD_ONLY resource', async () => {
      const boardOnlyResource = {
        id: 'resource-1',
        title: 'Board Doc',
        visibility: 'BOARD_ONLY',
        tenantId: 'test-tenant-id',
      };

      mocks.sessionResult = { user: { id: 'resident-user' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      const ownershipChain = makeSelectChain([]);
      const resourceChain = makeSelectChain([boardOnlyResource]);

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return roleChain;
        if (callCount === 2) return ownershipChain;
        return resourceChain;
      });

      const params = Promise.resolve({ id: 'resource-1' });
      const request = new Request('http://localhost/api/resources/resource-1');

      const response = await GET_BY_ID(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('returns resource for ADMIN regardless of visibility', async () => {
      const restrictedResource = {
        id: 'resource-1',
        title: 'Restricted Doc',
        visibility: 'BOARD_ONLY',
        tenantId: 'test-tenant-id',
      };

      mocks.sessionResult = { user: { id: 'admin-user' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const resourceChain = makeSelectChain([restrictedResource]);

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return roleChain;
        return resourceChain;
      });

      const params = Promise.resolve({ id: 'resource-1' });
      const request = new Request('http://localhost/api/resources/resource-1');

      const response = await GET_BY_ID(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Restricted Doc');
    });
  });

  describe('PATCH /api/resources/[id]', () => {
    it('requires ADMIN or MANAGER role', async () => {
      mocks.sessionResult = { user: { id: 'resident-user' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const params = Promise.resolve({ id: 'resource-1' });
      const request = new Request('http://localhost/api/resources/resource-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('allows ADMIN to update resource', async () => {
      mocks.sessionResult = { user: { id: 'admin-user' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const existChain = makeSelectChain([{ id: 'resource-1' }]);
      const updateChain = makeUpdateChain([{ id: 'resource-1', title: 'Updated' }]);

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return roleChain;
        return existChain;
      });
      mocks.dbMock.update.mockImplementation(() => updateChain);

      const params = Promise.resolve({ id: 'resource-1' });
      const request = new Request('http://localhost/api/resources/resource-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await PATCH(request, { params });
      expect(response.status).toBe(200);
    });

    it('returns 404 for non-existent resource', async () => {
      mocks.sessionResult = { user: { id: 'admin-user' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const existChain = makeSelectChain([]);

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return roleChain;
        return existChain;
      });

      const params = Promise.resolve({ id: 'nonexistent' });
      const request = new Request('http://localhost/api/resources/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await PATCH(request, { params });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/resources/[id]', () => {
    it('requires ADMIN role', async () => {
      mocks.sessionResult = { user: { id: 'committee-user' } };

      const roleChain = makeSelectChain([{ role: 'COMMITTEE' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const params = Promise.resolve({ id: 'resource-1' });
      const request = new Request('http://localhost/api/resources/resource-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('allows ADMIN to delete resource', async () => {
      mocks.sessionResult = { user: { id: 'admin-user' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const existChain = makeSelectChain([{ id: 'resource-1' }]);
      const deleteChain = makeDeleteChain();

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return roleChain;
        return existChain;
      });
      mocks.dbMock.delete.mockImplementation(() => deleteChain);

      const params = Promise.resolve({ id: 'resource-1' });
      const request = new Request('http://localhost/api/resources/resource-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 401 for unauthenticated user', async () => {
      mocks.sessionResult = null;

      const params = Promise.resolve({ id: 'resource-1' });
      const request = new Request('http://localhost/api/resources/resource-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
