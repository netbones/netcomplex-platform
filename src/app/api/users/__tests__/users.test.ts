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
  },
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
  apiForbidden: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'FORBIDDEN', message: message || 'Forbidden' } },
      { status: 403 }
    )
  ),
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
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
    tenantId: 'tenantId',
    name: 'name',
    email: 'email',
    role: 'role',
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
  apiPaginated: mocks.apiPaginated,
  apiForbidden: mocks.apiForbidden,
  now: mocks.now,
  withErrorHandler: mocks.withErrorHandler,
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

import { GET } from '@/app/api/users/route';
import { makeSelectChain } from '@/test/api/helpers';

function setupAuth(role = 'ADMIN') {
  mocks.sessionResult = { user: { id: 'admin-1' } };
  return role;
}

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns paginated users list', async () => {
    setupAuth();
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'user-1',
            name: 'Alice',
            email: 'alice@test.com',
            role: 'RESIDENT',
            isActive: true,
            isPublic: true,
            image: null,
            profileSlug: null,
          },
          {
            id: 'user-2',
            name: 'Bob',
            email: 'bob@test.com',
            role: 'BOARD',
            isActive: true,
            isPublic: true,
            image: null,
            profileSlug: null,
          },
        ])
      )
      .mockReturnValueOnce(makeSelectChain([{ total: 2 }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const request = new Request('http://localhost:3000/api/users');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
  });

  it('returns only public users when unauthenticated', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'user-1',
            name: 'Alice',
            email: 'alice@test.com',
            role: 'RESIDENT',
            isActive: true,
            isPublic: true,
            image: null,
            profileSlug: null,
          },
        ])
      )
      .mockReturnValueOnce(makeSelectChain([{ total: 1 }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const request = new Request('http://localhost:3000/api/users');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
  });

  it('returns empty list when no users match', async () => {
    setupAuth();
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([{ total: 0 }]));

    const request = new Request('http://localhost:3000/api/users');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(0);
    expect(body.meta.total).toBe(0);
  });
});
