import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

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
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
  requireAssistScopeResult: null as Response | null,
  throwIfSuspendedResult: null as Response | null,
  writeAuditLog: vi.fn(),
  getPlatformPageFlags: vi.fn(),
  withTenantOptional: vi.fn(),
  apiSuccess: vi.fn((data: unknown, _meta?: unknown, status = 200) =>
    Response.json({ success: true, data }, { status })
  ),
  apiCreated: vi.fn((data: unknown) => Response.json({ success: true, data }, { status: 201 })),
  apiUnauthorized: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'AUTH_REQUIRED', message: message || 'Authentication required' },
      },
      { status: 401 }
    )
  ),
  apiForbidden: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'FORBIDDEN', message: message || 'Forbidden' } },
      { status: 403 }
    )
  ),
  apiNotFound: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: message || 'Not found' } },
      { status: 404 }
    )
  ),
  apiValidationError: vi.fn((details?: unknown) =>
    Response.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
      },
      { status: 422 }
    )
  ),
  apiError: vi.fn((code: string, message: string, status: number) =>
    Response.json({ success: false, error: { code, message } }, { status })
  ),
  apiConflict: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'CONFLICT', message: message || 'Resource conflict' } },
      { status: 409 }
    )
  ),
  apiInternalError: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: message || 'Internal server error' },
      },
      { status: 500 }
    )
  ),
  apiPaginated: vi.fn((data: unknown[], page: number, limit: number, total: number) =>
    Response.json(
      {
        success: true,
        data,
        meta: { page, pageSize: limit, total, hasMore: page * limit < total },
      },
      { status: 200 }
    )
  ),
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  users: {
    id: 'id',
    role: 'role',
    name: 'name',
    email: 'email',
    phone: 'phone',
    interests: 'interests',
    avatar: 'avatar',
    image: 'image',
    books: 'books',
    dashboardLayout: 'dashboardLayout',
    isPublic: 'isPublic',
    showEmail: 'showEmail',
    showPhone: 'showPhone',
    isActive: 'isActive',
    isPlatformAdmin: 'isPlatformAdmin',
    residencyType: 'residencyType',
    profileSlug: 'profileSlug',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    tenantId: 'tenantId',
    emailVerified: 'emailVerified',
    twoFactorEnabled: 'twoFactorEnabled',
  },
  profiles: {
    id: 'id',
    tenantId: 'tenantId',
    userId: 'userId',
    householdId: 'householdId',
    householdRole: 'householdRole',
    residencyType: 'residencyType',
    rentalImage: 'rentalImage',
    occupantImage: 'occupantImage',
    status: 'status',
    displayName: 'displayName',
    profileAddress: 'profileAddress',
    avatar: 'avatar',
    isPublic: 'isPublic',
    occupantSince: 'occupantSince',
    landlordId: 'landlordId',
  },
  standardSeats: {
    id: 'id',
    tenantId: 'tenantId',
    userId: 'userId',
    propertyId: 'propertyId',
    isPrimaryOwner: 'isPrimaryOwner',
    platformAddress: 'platformAddress',
    createdAt: 'createdAt',
  },
  soloSeats: {
    id: 'id',
    userId: 'userId',
    propertyId: 'propertyId',
    seatType: 'seatType',
    platformAddress: 'platformAddress',
    createdAt: 'createdAt',
  },
  premiumSeats: {
    id: 'id',
    userId: 'userId',
    platformAddress: 'platformAddress',
    portfolioName: 'portfolioName',
    tier: 'tier',
    isActive: 'isActive',
  },
  properties: {
    id: 'id',
    street: 'street',
    unit: 'unit',
    homeImage: 'homeImage',
    platformAddress: 'platformAddress',
    tenantId: 'tenantId',
  },
  households: {
    id: 'id',
    tenantId: 'tenantId',
    propertyId: 'propertyId',
    occupancyType: 'occupancyType',
    status: 'status',
    createdAt: 'createdAt',
  },
  contents: {
    id: 'id',
    tenantId: 'tenantId',
    authorId: 'authorId',
    title: 'title',
    excerpt: 'excerpt',
    content: 'content',
    category: 'category',
    tags: 'tags',
    published: 'published',
    publishedAt: 'publishedAt',
    createdAt: 'createdAt',
  },
  platformSuspensions: {
    id: 'id',
    tenantId: 'tenantId',
    userId: 'userId',
    suspensionType: 'suspensionType',
    reason: 'reason',
    description: 'description',
    startDate: 'startDate',
    endDate: 'endDate',
    isPermanent: 'isPermanent',
    isActive: 'isActive',
    createdById: 'createdById',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  throwIfSuspended: (_req: unknown) => mocks.throwIfSuspendedResult,
  writeAuditLog: (...args: unknown[]) => mocks.writeAuditLog(...args),
  apiSuccess: mocks.apiSuccess,
  apiCreated: mocks.apiCreated,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiNotFound: mocks.apiNotFound,
  apiValidationError: mocks.apiValidationError,
  apiError: mocks.apiError,
  apiConflict: mocks.apiConflict,
  apiInternalError: mocks.apiInternalError,
  apiPaginated: mocks.apiPaginated,
}));

vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  withTenantOptional: () =>
    Promise.resolve({
      tenantId: 'test-tenant-id' as string | undefined,
      tenantSlug: 'test-tenant' as string | undefined,
    }),
  requireAssistScope: (_req: unknown, _scope: unknown) =>
    Promise.resolve(mocks.requireAssistScopeResult),
  getPlatformPageFlags: (...args: unknown[]) => mocks.getPlatformPageFlags(...args),
}));

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  };
});

import { GET as listUsers, POST as createUser } from '@/app/api/users/route';
import {
  GET as getUser,
  PATCH as updateUser,
  DELETE as deleteUser,
} from '@/app/api/users/[id]/route';
import { POST as suspendUser } from '@/app/api/users/[id]/suspend/route';
import { POST as unsuspendUser } from '@/app/api/users/[id]/unsuspend/route';
import { GET as listSuspensions } from '@/app/api/users/[id]/suspensions/route';
import { GET as getBooks, POST as postBooks } from '@/app/api/users/[id]/books/route';
import { GET as listHouseholds } from '@/app/api/households/route';
import { GET as getHousehold, PATCH as updateHousehold } from '@/app/api/households/[id]/route';
import { GET as getFlags } from '@/app/api/flags/route';
import { makeSelectChain } from './helpers';

function setupAuthAdmin() {
  mocks.sessionResult = { user: { id: 'admin-1' } };
}

function setupAuthResident() {
  mocks.sessionResult = { user: { id: 'user-1' } };
}

describe('Directory API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.requireAssistScopeResult = null;
    mocks.throwIfSuspendedResult = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/users', () => {
    it('returns paginated results without auth', async () => {
      mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'RESIDENT' }]));

      const request = new Request('http://localhost:3000/api/users');
      const response = await listUsers(request);

      expect(response.status).toBe(200);
    });

    it('returns users with role-based filtering when authenticated as admin', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'ADMIN' }]));

      const request = new Request('http://localhost:3000/api/users?role=ADMIN&page=1&limit=6');
      const response = await listUsers(request);

      expect(response.status).toBe(200);
    });

    it('filters by search query param', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'ADMIN' }]));

      const request = new Request('http://localhost:3000/api/users?search=alice');
      const response = await listUsers(request);

      expect(response.status).toBe(200);
    });

    it('enforces pagination limits', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'ADMIN' }]));

      const request = new Request('http://localhost:3000/api/users?page=2&limit=3');
      const response = await listUsers(request);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/users', () => {
    it('returns 403 without auth', async () => {
      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
      });
      const response = await createUser(request);
      expect(response.status).toBe(403);
    });

    it('returns 403 for RESIDENT without users permission', async () => {
      setupAuthResident();
      mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'RESIDENT' }]));

      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
      });
      const response = await createUser(request);
      expect(response.status).toBe(403);
    });

    it('creates user with ADMIN role', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn(() =>
            Promise.resolve([{ id: 'new-user', email: 'new@test.com', name: 'New User' }])
          ),
        }),
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
      });
      const response = await createUser(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('new@test.com');
    });
  });

  describe('GET /api/users/[id]', () => {
    it('returns public user profile by UUID', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: 'user-1', name: 'Alice', email: 'alice@test.com', role: 'RESIDENT' },
          ])
        )
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/users/user-1');
      const response = await getUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('looks up user by profileSlug when not found by id', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-2', name: 'Bob', role: 'RESIDENT' }]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/users/bob-profile');
      const response = await getUser(request, { params: Promise.resolve({ id: 'bob-profile' }) });

      expect(response.status).toBe(200);
    });

    it('returns 404 when user not found', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/users/nonexistent');
      const response = await getUser(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/users/[id]', () => {
    it('returns 403 when requireAssistScope fails', async () => {
      mocks.requireAssistScopeResult = new Response(
        JSON.stringify({ error: 'AssistSession scope restriction' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );

      const request = new Request('http://localhost:3000/api/users/user-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await updateUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 401 without session when scope passes', async () => {
      mocks.requireAssistScopeResult = null;
      mocks.sessionResult = null;

      const request = new Request('http://localhost:3000/api/users/user-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await updateUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(401);
    });

    it('returns 403 when throwIfSuspended blocks', async () => {
      mocks.requireAssistScopeResult = null;
      setupAuthAdmin();
      mocks.throwIfSuspendedResult = new Response(
        JSON.stringify({
          success: false,
          error: { code: 'SUSPENDED_USER', message: 'Account suspended' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );

      const request = new Request('http://localhost:3000/api/users/user-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await updateUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(403);
    });

    it('updates user fields with valid auth and scope', async () => {
      mocks.requireAssistScopeResult = null;
      mocks.throwIfSuspendedResult = null;
      setupAuthAdmin();
      mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn(() =>
              Promise.resolve([{ id: 'user-1', name: 'Updated Name', role: 'RESIDENT' }])
            ),
          }),
        }),
      });

      const request = new Request('http://localhost:3000/api/users/user-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await updateUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('DELETE /api/users/[id]', () => {
    it('returns 403 when requireAssistScope fails', async () => {
      mocks.requireAssistScopeResult = new Response(
        JSON.stringify({ error: 'AssistSession scope restriction' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );

      const request = new Request('http://localhost:3000/api/users/user-1', { method: 'DELETE' });
      const response = await deleteUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 403 when user is suspended', async () => {
      mocks.requireAssistScopeResult = null;
      mocks.throwIfSuspendedResult = new Response(
        JSON.stringify({
          success: false,
          error: { code: 'SUSPENDED_USER', message: 'Account suspended' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );

      const request = new Request('http://localhost:3000/api/users/user-1', { method: 'DELETE' });
      const response = await deleteUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(403);
    });

    it('deletes user and returns success', async () => {
      mocks.requireAssistScopeResult = null;
      mocks.throwIfSuspendedResult = null;
      mocks.dbMock.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn(() => Promise.resolve([{ id: 'user-1' }])),
        }),
      });

      const request = new Request('http://localhost:3000/api/users/user-1', { method: 'DELETE' });
      const response = await deleteUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(200);
    });

    it('returns 404 when user not found for delete', async () => {
      mocks.requireAssistScopeResult = null;
      mocks.throwIfSuspendedResult = null;
      mocks.dbMock.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn(() => Promise.resolve([])),
        }),
      });

      const request = new Request('http://localhost:3000/api/users/user-1', { method: 'DELETE' });
      const response = await deleteUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/users/[id]/suspend', () => {
    it('returns 403 when requireAssistScope fails', async () => {
      mocks.requireAssistScopeResult = new Response(
        JSON.stringify({ error: 'AssistSession scope restriction' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );

      const request = new Request('http://localhost:3000/api/users/user-1/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionType: 'VIOLATION', reason: 'Broke rule' }),
      });
      const response = await suspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 401 without session', async () => {
      mocks.requireAssistScopeResult = null;
      mocks.sessionResult = null;

      const request = new Request('http://localhost:3000/api/users/user-1/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionType: 'VIOLATION', reason: 'Broke rule' }),
      });
      const response = await suspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(401);
    });

    it('returns 403 when non-admin tries to suspend', async () => {
      mocks.requireAssistScopeResult = null;
      setupAuthResident();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

      const request = new Request('http://localhost:3000/api/users/user-1/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionType: 'VIOLATION', reason: 'Broke rule' }),
      });
      const response = await suspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid suspension type', async () => {
      mocks.requireAssistScopeResult = null;
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]));

      const request = new Request('http://localhost:3000/api/users/user-1/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionType: 'INVALID_TYPE', reason: 'Broke rule XYZ' }),
      });
      const response = await suspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(400);
    });

    it('returns 400 when reason is too short', async () => {
      mocks.requireAssistScopeResult = null;
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]));

      const request = new Request('http://localhost:3000/api/users/user-1/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionType: 'VIOLATION', reason: 'ab' }),
      });
      const response = await suspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(400);
    });

    it('returns 409 when user already has active suspension', async () => {
      mocks.requireAssistScopeResult = null;
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]))
        .mockReturnValueOnce(
          makeSelectChain([{ id: 'susp-1', suspensionType: 'VIOLATION', isActive: true }])
        );

      const request = new Request('http://localhost:3000/api/users/user-1/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionType: 'VIOLATION', reason: 'Broke rule again' }),
      });
      const response = await suspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(409);
    });

    it('creates suspension for admin with valid data', async () => {
      mocks.requireAssistScopeResult = null;
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]))
        .mockReturnValueOnce(makeSelectChain([]));
      mocks.dbMock.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn(() =>
                Promise.resolve([
                  {
                    id: 'susp-new',
                    suspensionType: 'VIOLATION',
                    reason: 'Broke rule',
                    isActive: true,
                  },
                ])
              ),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn(() => Promise.resolve()),
            }),
          }),
        };
        return fn(tx);
      });

      const request = new Request('http://localhost:3000/api/users/user-1/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionType: 'VIOLATION', reason: 'Broke community rules' }),
      });
      const response = await suspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(201);
    });
  });

  describe('POST /api/users/[id]/unsuspend', () => {
    it('returns 401 without session', async () => {
      mocks.requireAssistScopeResult = null;
      mocks.sessionResult = null;

      const request = new Request('http://localhost:3000/api/users/user-1/unsuspend', {
        method: 'POST',
      });
      const response = await unsuspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(401);
    });

    it('returns 403 when non-admin tries to unsuspend', async () => {
      mocks.requireAssistScopeResult = null;
      setupAuthResident();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

      const request = new Request('http://localhost:3000/api/users/user-1/unsuspend', {
        method: 'POST',
      });
      const response = await unsuspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 409 when user has no active suspension', async () => {
      mocks.requireAssistScopeResult = null;
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]))
        .mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/users/user-1/unsuspend', {
        method: 'POST',
      });
      const response = await unsuspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(409);
    });

    it('unsuspends user successfully', async () => {
      mocks.requireAssistScopeResult = null;
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'susp-1' }]));
      mocks.dbMock.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn(() =>
                  Promise.resolve([
                    {
                      id: 'user-1',
                      name: 'Alice',
                      email: 'alice@test.com',
                      role: 'RESIDENT',
                      isActive: true,
                    },
                  ])
                ),
              }),
            }),
          }),
        };
        return fn(tx);
      });

      const request = new Request('http://localhost:3000/api/users/user-1/unsuspend', {
        method: 'POST',
      });
      const response = await unsuspendUser(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/users/[id]/suspensions', () => {
    it('returns 401 without session', async () => {
      const request = new Request('http://localhost:3000/api/users/user-1/suspensions');
      const response = await listSuspensions(request, {
        params: Promise.resolve({ id: 'user-1' }),
      });

      expect(response.status).toBe(401);
    });

    it('returns 403 when non-admin attempts access', async () => {
      setupAuthResident();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

      const request = new Request('http://localhost:3000/api/users/user-1/suspensions');
      const response = await listSuspensions(request, {
        params: Promise.resolve({ id: 'user-1' }),
      });

      expect(response.status).toBe(403);
    });

    it('returns suspension history for admin', async () => {
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
        .mockReturnValueOnce(
          makeSelectChain([
            { id: 'susp-1', suspensionType: 'VIOLATION', reason: 'Broke rule', isActive: false },
          ])
        );

      const request = new Request('http://localhost:3000/api/users/user-1/suspensions');
      const response = await listSuspensions(request, {
        params: Promise.resolve({ id: 'user-1' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.suspensions).toHaveLength(1);
    });
  });

  describe('GET /api/users/[id]/books', () => {
    it('returns empty books array for missing user', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/users/nonexistent/books');
      const response = await getBooks(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.books).toEqual([]);
    });

    it('returns books for existing user', async () => {
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ books: [{ id: 'book-1', title: 'Test Book' }] }])
      );

      const request = new Request('http://localhost:3000/api/users/user-1/books');
      const response = await getBooks(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.books).toEqual([{ id: 'book-1', title: 'Test Book' }]);
    });
  });

  describe('POST /api/users/[id]/books', () => {
    it('returns 404 when user not found', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/users/nonexistent/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', book: { id: 'b1', title: 'Test' } }),
      });
      const response = await postBooks(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });

    it('adds a book to user collection', async () => {
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ books: [{ id: 'book-1', title: 'Existing' }] }])
      );
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn(() => Promise.resolve()),
        }),
      });

      const request = new Request('http://localhost:3000/api/users/user-1/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', book: { id: 'book-2', title: 'New Book' } }),
      });
      const response = await postBooks(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('removes a book from user collection', async () => {
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            books: [
              { id: 'book-1', title: 'Keep' },
              { id: 'book-2', title: 'Remove' },
            ],
          },
        ])
      );
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn(() => Promise.resolve()),
        }),
      });

      const request = new Request('http://localhost:3000/api/users/user-1/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', bookId: 'book-2' }),
      });
      const response = await postBooks(request, { params: Promise.resolve({ id: 'user-1' }) });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/households', () => {
    it('returns 401 without auth', async () => {
      const request = new NextRequest('http://localhost:3000/api/households');
      const response = await listHouseholds(request);

      expect(response.status).toBe(401);
    });

    it('returns 403 when user lacks households permission', async () => {
      setupAuthResident();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

      const request = new NextRequest('http://localhost:3000/api/households');
      const response = await listHouseholds(request);

      expect(response.status).toBe(403);
    });

    it('returns paginated households for admin', async () => {
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
        .mockReturnValueOnce(makeSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(
          makeSelectChain([{ id: 'h-1', street: 'Main St', unit: '1A', status: 'ACTIVE' }])
        )
        .mockReturnValueOnce(makeSelectChain([{ count: 2 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 1 }]))
        .mockReturnValueOnce(
          makeSelectChain([{ id: 'user-1', name: 'Alice', email: 'alice@test.com' }])
        );

      const request = new NextRequest('http://localhost:3000/api/households?page=1&limit=10');
      const response = await listHouseholds(request);

      expect(response.status).toBe(200);
    });

    it('filters households by search query', async () => {
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
        .mockReturnValueOnce(makeSelectChain([{ total: 2 }]))
        .mockReturnValueOnce(
          makeSelectChain([
            { id: 'h-1', street: 'Main St', unit: '1A', status: 'ACTIVE' },
            { id: 'h-2', street: 'Oak Ave', unit: '2B', status: 'ACTIVE' },
          ])
        )
        .mockReturnValueOnce(makeSelectChain([{ count: 1 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([{ count: 2 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 1 }]))
        .mockReturnValueOnce(
          makeSelectChain([{ id: 'user-2', name: 'Bob', email: 'bob@test.com' }])
        );

      const request = new NextRequest('http://localhost:3000/api/households?search=Main');
      const response = await listHouseholds(request);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/households/[id]', () => {
    it('returns 404 when household not found', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new NextRequest('http://localhost:3000/api/households/nonexistent');
      const response = await getHousehold(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });

      expect(response.status).toBe(404);
    });

    it('returns household with occupants and contents', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(
          makeSelectChain([{ id: 'h-1', street: 'Main St', unit: '1A', status: 'ACTIVE' }])
        )
        .mockReturnValueOnce(
          makeSelectChain([{ id: 'seat-1', userId: 'user-1', isPrimaryOwner: true, name: 'Alice' }])
        )
        .mockReturnValueOnce(makeSelectChain([{ id: 'profile-1', displayName: 'Bob Tenant' }]))
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: 'c-1',
              title: '{}',
              excerpt: '{}',
              content: '{}',
              category: 'news',
              tags: [],
              publishedAt: null,
              createdAt: new Date(),
              authorId: 'user-1',
            },
          ])
        );

      const request = new NextRequest('http://localhost:3000/api/households/h-1');
      const response = await getHousehold(request, { params: Promise.resolve({ id: 'h-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('PATCH /api/households/[id]', () => {
    it('returns 401 without auth', async () => {
      const request = new NextRequest('http://localhost:3000/api/households/h-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeImage: 'new-image.jpg' }),
      });
      const response = await updateHousehold(request, { params: Promise.resolve({ id: 'h-1' }) });

      expect(response.status).toBe(401);
    });

    it('returns 403 when not owner and no households permission', async () => {
      setupAuthResident();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'h-1', propertyId: 'prop-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ userId: 'other-user' }]));

      const request = new NextRequest('http://localhost:3000/api/households/h-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeImage: 'new-image.jpg' }),
      });
      const response = await updateHousehold(request, { params: Promise.resolve({ id: 'h-1' }) });

      expect(response.status).toBe(403);
    });

    it('allows update when user has households permission', async () => {
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'h-1', propertyId: 'prop-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ userId: 'other-user' }]));
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn(() => Promise.resolve()),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/households/h-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeImage: 'new-image.jpg' }),
      });
      const response = await updateHousehold(request, { params: Promise.resolve({ id: 'h-1' }) });

      expect(response.status).toBe(200);
    });

    it('allows update when user is property owner', async () => {
      setupAuthResident();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'h-1', propertyId: 'prop-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ userId: 'user-1' }]));
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn(() => Promise.resolve()),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/households/h-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeImage: 'new-image.jpg' }),
      });
      const response = await updateHousehold(request, { params: Promise.resolve({ id: 'h-1' }) });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/flags', () => {
    it('returns platform flags', async () => {
      mocks.getPlatformPageFlags.mockResolvedValue({
        campaign: true,
        chat: true,
        events: true,
        directory: true,
        bookings: true,
      });

      const request = new NextRequest('http://localhost:3000/api/flags');
      const response = await getFlags(request);

      expect(response.status).toBe(200);
      expect(mocks.getPlatformPageFlags).toHaveBeenCalled();
    });

    it('returns a single flag by name', async () => {
      mocks.getPlatformPageFlags.mockResolvedValue({
        campaign: false,
        chat: true,
        events: true,
        directory: true,
        bookings: false,
      });

      const request = new NextRequest('http://localhost:3000/api/flags?flag=chat');
      const response = await getFlags(request);

      expect(response.status).toBe(200);
    });

    it('returns 400 for invalid flag param', async () => {
      const request = new NextRequest('http://localhost:3000/api/flags?flag=invalid');
      const response = await getFlags(request);

      expect(response.status).toBe(400);
    });
  });
});
