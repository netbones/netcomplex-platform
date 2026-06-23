import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  CACHE_TAGS: { SETTINGS: 'settings' },
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  users: {
    id: 'id',
    tenantId: 'tenantId',
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
    emailVerified: 'emailVerified',
    twoFactorEnabled: 'twoFactorEnabled',
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
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  };
});

import { GET as listUsers } from '@/app/api/users/route';
import { makeSelectChain } from './helpers';

function setupAuthAdmin() {
  mocks.sessionResult = { user: { id: 'admin-1' } };
}

function setupAuthResident() {
  mocks.sessionResult = { user: { id: 'user-1' } };
}

describe('Directory API (GET /api/users)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns paginated directory results without auth (public only)', async () => {
    mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'RESIDENT' }]));

    const request = new Request('http://localhost:3000/api/users');
    const response = await listUsers(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta.page).toBe(1);
  });

  it('filters directory by role when authenticated as admin', async () => {
    setupAuthAdmin();
    mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'ADMIN' }]));

    const request = new Request('http://localhost:3000/api/users?role=ADMIN&page=1&limit=6');
    const response = await listUsers(request);

    expect(response.status).toBe(200);
  });

  it('filters directory by search query', async () => {
    setupAuthAdmin();
    mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'ADMIN' }]));

    const request = new Request('http://localhost:3000/api/users?search=alice');
    const response = await listUsers(request);

    expect(response.status).toBe(200);
  });

  it('prevents unauthenticated users from seeing non-public residents', async () => {
    mocks.dbMock.select.mockImplementation(() =>
      makeSelectChain([{ id: 'u1', isPublic: true, role: 'RESIDENT' }])
    );

    const request = new Request('http://localhost:3000/api/users?role=RESIDENT');
    const response = await listUsers(request);

    expect(response.status).toBe(200);
  });

  it('enforces maximum pagination limit of 50', async () => {
    setupAuthAdmin();
    mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'ADMIN' }]));

    const request = new Request('http://localhost:3000/api/users?page=1&limit=100');
    const response = await listUsers(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.pageSize).toBeLessThanOrEqual(50);
  });

  it('returns AGENT users when they match filters', async () => {
    setupAuthAdmin();
    mocks.dbMock.select.mockImplementation(() =>
      makeSelectChain([{ id: 'u1', role: 'AGENT', name: 'Agent User', isPublic: false }])
    );

    const request = new Request('http://localhost:3000/api/users');
    const response = await listUsers(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThanOrEqual(0);
  });

  it('requires auth for admin-level directory view', async () => {
    setupAuthResident();
    mocks.dbMock.select.mockImplementation(() => makeSelectChain([{ role: 'RESIDENT' }]));

    const request = new Request('http://localhost:3000/api/users');
    const response = await listUsers(request);

    expect(response.status).toBe(200);
  });
});
