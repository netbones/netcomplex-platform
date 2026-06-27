import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const req = (url: string, init?: RequestInit): NextRequest =>
  new Request(url, init) as unknown as NextRequest;

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
}));

vi.mock('@api/server', () => ({
  CACHE_TAGS: { SETTINGS: 'settings' },
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  communityServiceListings: {
    id: 'id',
    tenantId: 'tenantId',
    providerId: 'providerId',
    title: 'title',
    description: 'description',
    category: 'category',
    subcategory: 'subcategory',
    priceType: 'priceType',
    price: 'price',
    currency: 'currency',
    serviceAreas: 'serviceAreas',
    availability: 'availability',
    licenseNumber: 'licenseNumber',
    insuranceExpiry: 'insuranceExpiry',
    responseTime: 'responseTime',
    contactMethods: 'contactMethods',
    images: 'images',
    portfolio: 'portfolio',
    status: 'status',
    isPublished: 'isPublished',
    isFeatured: 'isFeatured',
    rating: 'rating',
    reviewCount: 'reviewCount',
    termsAndConditions: 'termsAndConditions',
    cancellationPolicy: 'cancellationPolicy',
    verificationDate: 'verificationDate',
    verified: 'verified',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    slug: 'slug',
    locale: 'locale',
    deletedAt: 'deletedAt',
    __brand: 'table',
  },
  communityServiceReviews: {
    id: 'id',
    listingId: 'listingId',
    reviewerId: 'reviewerId',
    rating: 'rating',
    title: 'title',
    comment: 'comment',
    serviceDate: 'serviceDate',
    responseQuality: 'responseQuality',
    isPublished: 'isPublished',
    createdAt: 'createdAt',
    __brand: 'table',
  },
  communityServiceInquiries: {
    id: 'id',
    listingId: 'listingId',
    inquirerId: 'inquirerId',
    status: 'status',
    createdAt: 'createdAt',
    __brand: 'table',
  },
  users: { id: 'id', role: 'role', name: 'name', email: 'email', avatar: 'avatar', phone: 'phone' },
  now: () => new Date('2026-06-21T12:00:00.000Z'),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiForbidden: vi.fn(
    (message?: string) =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'FORBIDDEN', message: message || 'Forbidden' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiInternalError: vi.fn(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiError: vi.fn(
    (_code: string, message: string, status = 400) =>
      new Response(JSON.stringify({ success: false, error: { code: _code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

/**
 * Extended select chain that supports orderBy/limit/offset chaining after where().
 */
function makeFullSelectChain(result: unknown[]) {
  const createThenable = (): Record<string, unknown> => ({
    then: (resolve: (v: unknown[]) => void) => Promise.resolve(result).then(resolve),
    limit: vi.fn(function () {
      return createThenable();
    }),
    orderBy: vi.fn(function () {
      return createThenable();
    }),
    offset: vi.fn(function () {
      return createThenable();
    }),
    groupBy: vi.fn(() => Promise.resolve(result)),
  });

  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => createThenable());
  chain.limit = vi.fn(function () {
    return createThenable();
  });
  chain.orderBy = vi.fn(function () {
    return createThenable();
  });
  chain.groupBy = vi.fn(() => Promise.resolve(result));
  return chain;
}

import { GET } from '@/app/api/community-services/analytics/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = null;
  mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/community-services/analytics', () => {
  it('returns 401 without authentication', async () => {
    const response = await GET(req('http://localhost:3000/api/community-services/analytics'));
    expect(response.status).toBe(401);
  });

  it('returns 403 for RESIDENT role', async () => {
    mocks.sessionResult = { user: { id: 'resident-1' } };
    const roleChain = makeFullSelectChain([{ role: 'RESIDENT' }]);
    mocks.dbMock.select.mockReturnValue(roleChain);

    const response = await GET(req('http://localhost:3000/api/community-services/analytics'));
    expect(response.status).toBe(403);
  });

  it('returns analytics for ADMIN role', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'ADMIN' }]);
      if (callIdx === 2) return makeFullSelectChain([{ count: 25 }]);
      if (callIdx === 3) return makeFullSelectChain([{ count: 20 }]);
      if (callIdx === 4) return makeFullSelectChain([{ providerId: 'p1' }, { providerId: 'p2' }]);
      if (callIdx === 5) return makeFullSelectChain([{ count: 50 }]);
      if (callIdx === 6) return makeFullSelectChain([{ count: 30 }]);
      if (callIdx === 7)
        return makeFullSelectChain([
          { category: 'GARDENING', count: 10 },
          { category: 'MAINTENANCE', count: 5 },
        ]);
      if (callIdx === 8) return makeFullSelectChain([]);
      return makeFullSelectChain([{ avgRating: 4.2, count: 50 }]);
    });

    const response = await GET(req('http://localhost:3000/api/community-services/analytics'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.overview.totalListings).toBe(25);
    expect(body.data.overview.activeListings).toBe(20);
    expect(body.data.overview.totalProviders).toBe(2);
    expect(body.data.overview.totalReviews).toBe(50);
    expect(body.data.overview.totalInquiries).toBe(30);
    expect(body.data.overview.averageRating).toBe(4.2);
    expect(body.data.categories).toHaveLength(2);
  });

  it('returns analytics for BOARD role', async () => {
    mocks.sessionResult = { user: { id: 'board-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'BOARD' }]);
      if (callIdx === 2) return makeFullSelectChain([{ count: 10 }]);
      if (callIdx === 3) return makeFullSelectChain([{ count: 8 }]);
      if (callIdx === 4) return makeFullSelectChain([]);
      if (callIdx === 5) return makeFullSelectChain([{ count: 0 }]);
      if (callIdx === 6) return makeFullSelectChain([{ count: 0 }]);
      if (callIdx === 7) return makeFullSelectChain([]);
      if (callIdx === 8) return makeFullSelectChain([]);
      return makeFullSelectChain([{ avgRating: null, count: 0 }]);
    });

    const response = await GET(req('http://localhost:3000/api/community-services/analytics'));
    expect(response.status).toBe(200);
  });

  it('returns analytics for COMMITTEE role', async () => {
    mocks.sessionResult = { user: { id: 'committee-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'COMMITTEE' }]);
      if (callIdx === 2) return makeFullSelectChain([{ count: 5 }]);
      if (callIdx === 3) return makeFullSelectChain([{ count: 3 }]);
      if (callIdx === 4) return makeFullSelectChain([{ providerId: 'p1' }]);
      if (callIdx === 5) return makeFullSelectChain([{ count: 5 }]);
      if (callIdx === 6) return makeFullSelectChain([{ count: 2 }]);
      if (callIdx === 7) return makeFullSelectChain([]);
      if (callIdx === 8) return makeFullSelectChain([]);
      return makeFullSelectChain([{ avgRating: 3.5, count: 5 }]);
    });

    const response = await GET(req('http://localhost:3000/api/community-services/analytics'));
    expect(response.status).toBe(200);
  });

  it('respects period=7d query param', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'ADMIN' }]);
      if (callIdx === 2) return makeFullSelectChain([{ count: 5 }]);
      if (callIdx === 3) return makeFullSelectChain([{ count: 5 }]);
      if (callIdx === 4) return makeFullSelectChain([]);
      if (callIdx === 5) return makeFullSelectChain([{ count: 3 }]);
      if (callIdx === 6) return makeFullSelectChain([{ count: 1 }]);
      if (callIdx === 7) return makeFullSelectChain([]);
      if (callIdx === 8) return makeFullSelectChain([]);
      return makeFullSelectChain([{ avgRating: 4.5, count: 3 }]);
    });

    const response = await GET(
      req('http://localhost:3000/api/community-services/analytics?period=7d')
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.period).toBe('7d');
  });

  it('respects period=90d query param', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'ADMIN' }]);
      if (callIdx === 2) return makeFullSelectChain([{ count: 50 }]);
      if (callIdx === 3) return makeFullSelectChain([{ count: 40 }]);
      if (callIdx === 4) return makeFullSelectChain([{ providerId: 'p1' }]);
      if (callIdx === 5) return makeFullSelectChain([{ count: 100 }]);
      if (callIdx === 6) return makeFullSelectChain([{ count: 60 }]);
      if (callIdx === 7) return makeFullSelectChain([]);
      if (callIdx === 8) return makeFullSelectChain([]);
      return makeFullSelectChain([{ avgRating: 4.0, count: 100 }]);
    });

    const response = await GET(
      req('http://localhost:3000/api/community-services/analytics?period=90d')
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.period).toBe('90d');
  });

  it('uses all-time range for unknown period value', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'ADMIN' }]);
      if (callIdx === 2) return makeFullSelectChain([{ count: 100 }]);
      if (callIdx === 3) return makeFullSelectChain([{ count: 80 }]);
      if (callIdx === 4) return makeFullSelectChain([]);
      if (callIdx === 5) return makeFullSelectChain([{ count: 200 }]);
      if (callIdx === 6) return makeFullSelectChain([{ count: 150 }]);
      if (callIdx === 7) return makeFullSelectChain([]);
      if (callIdx === 8) return makeFullSelectChain([]);
      return makeFullSelectChain([{ avgRating: 4.1, count: 200 }]);
    });

    const response = await GET(
      req('http://localhost:3000/api/community-services/analytics?period=all')
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.period).toBe('all');
  });

  it('returns zero counts when no data exists', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'ADMIN' }]);
      if (callIdx === 2) return makeFullSelectChain([{ count: 0 }]);
      if (callIdx === 3) return makeFullSelectChain([{ count: 0 }]);
      if (callIdx === 4) return makeFullSelectChain([]);
      if (callIdx === 5) return makeFullSelectChain([{ count: 0 }]);
      if (callIdx === 6) return makeFullSelectChain([{ count: 0 }]);
      if (callIdx === 7) return makeFullSelectChain([]);
      if (callIdx === 8) return makeFullSelectChain([]);
      return makeFullSelectChain([{ avgRating: null, count: 0 }]);
    });

    const response = await GET(req('http://localhost:3000/api/community-services/analytics'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.overview.totalListings).toBe(0);
    expect(body.data.overview.activeListings).toBe(0);
    expect(body.data.overview.totalProviders).toBe(0);
    expect(body.data.overview.averageRating).toBe(0);
  });

  it('handles database errors gracefully', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    mocks.dbMock.select.mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    const response = await GET(req('http://localhost:3000/api/community-services/analytics'));
    expect(response.status).toBe(500);
  });
});
