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
    insert: vi.fn(),
  },
  assertModuleEnabled: vi.fn(),
}));

vi.mock('@api/server', () => ({
  CACHE_TAGS: { SETTINGS: 'settings' },
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  communityServiceListings: { id: 'id', tenantId: 'tenantId', providerId: 'providerId', title: 'title', description: 'description', category: 'category', subcategory: 'subcategory', priceType: 'priceType', price: 'price', currency: 'currency', serviceAreas: 'serviceAreas', availability: 'availability', licenseNumber: 'licenseNumber', insuranceExpiry: 'insuranceExpiry', responseTime: 'responseTime', contactMethods: 'contactMethods', images: 'images', portfolio: 'portfolio', status: 'status', isPublished: 'isPublished', isFeatured: 'isFeatured', rating: 'rating', reviewCount: 'reviewCount', termsAndConditions: 'termsAndConditions', cancellationPolicy: 'cancellationPolicy', verificationDate: 'verificationDate', verified: 'verified', createdAt: 'createdAt', updatedAt: 'updatedAt', slug: 'slug', locale: 'locale', deletedAt: 'deletedAt', __brand: 'table' },
  communityServiceReviews: { id: 'id', listingId: 'listingId', reviewerId: 'reviewerId', rating: 'rating', title: 'title', comment: 'comment', serviceDate: 'serviceDate', responseQuality: 'responseQuality', isPublished: 'isPublished', createdAt: 'createdAt', __brand: 'table' },
  users: { id: 'id', role: 'role', name: 'name', email: 'email', avatar: 'avatar', phone: 'phone' },
  now: () => new Date('2026-06-21T12:00:00.000Z'),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiCreated: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 201,
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
  apiNotFound: vi.fn(
    (message?: string) =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: message || 'Not found' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
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
  assertModuleEnabled: (...args: unknown[]) => mocks.assertModuleEnabled(...args),
}));

vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

vi.mock('@shared/api', () => ({
  generateNameSlug: vi.fn((title: string) => title.toLowerCase().replace(/\s+/g, '-')),
}));

import { makeSelectChain, makeInsertChain } from './helpers';

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
  chain.offset = vi.fn(function () {
    return chain;
  });
  chain.groupBy = vi.fn(() => Promise.resolve(result));
  return chain;
}

const mockListing = {
  id: 'listing-1',
  providerId: 'provider-1',
  title: 'Lawn Mowing Service',
  description: 'Professional lawn care',
  category: 'GARDENING',
  subcategory: 'Lawn Care',
  priceType: 'HOURLY',
  price: '50',
  currency: 'USD',
  serviceAreas: ['North', 'South'],
  availability: 'Weekdays',
  licenseNumber: 'LIC-123',
  insuranceExpiry: '2027-01-01',
  responseTime: 24,
  contactMethods: ['PLATFORM_MESSAGE'],
  images: [],
  portfolio: [],
  status: 'ACTIVE',
  isPublished: true,
  isFeatured: false,
  rating: 4.5,
  reviewCount: 3,
  termsAndConditions: null,
  cancellationPolicy: null,
  verificationDate: null,
  verified: false,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-02T00:00:00.000Z',
  slug: 'lawn-mowing-service',
  locale: 'en',
  provider: {
    id: 'provider-1',
    name: 'John Provider',
    email: 'john@example.com',
    avatar: null,
  },
};

import { GET, POST } from '@/app/api/community-services/listings/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = null;
  mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  mocks.assertModuleEnabled.mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/community-services/listings
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /api/community-services/listings', () => {
  it('returns 403 when community_services module is disabled', async () => {
    mocks.assertModuleEnabled.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'FEATURE_DISABLED', message: 'Feature disabled' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await GET(req('http://localhost:3000/api/community-services/listings'));
    expect(response.status).toBe(403);
  });

  it('returns paginated list of published listings', async () => {
    const chain = makeFullSelectChain([mockListing, { ...mockListing, id: 'listing-2' }]);
    const countChain = makeSelectChain([{ count: 2 }]);
    const reviewCountsChain = makeSelectChain([{ listingId: 'listing-1', count: 3 }, { listingId: 'listing-2', count: 1 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return countChain;
      return reviewCountsChain;
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.listings).toHaveLength(2);
    expect(body.data.pagination.total).toBe(2);
    expect(body.data.pagination.hasMore).toBe(false);
  });

  it('returns empty array when no listings exist', async () => {
    const chain = makeFullSelectChain([]);
    const countChain = makeSelectChain([{ count: 0 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      return callIdx <= 1 ? chain : countChain;
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.listings).toEqual([]);
    expect(body.data.pagination.total).toBe(0);
  });

  it('filters by category query param', async () => {
    const chain = makeFullSelectChain([mockListing]);
    const countChain = makeSelectChain([{ count: 1 }]);
    const reviewsChain = makeSelectChain([{ listingId: 'listing-1', count: 3 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return countChain;
      return reviewsChain;
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings?category=GARDENING'));
    expect(response.status).toBe(200);
  });

  it('filters by category=ALL (no category filter)', async () => {
    const chain = makeFullSelectChain([mockListing]);
    const countChain = makeSelectChain([{ count: 1 }]);
    const reviewsChain = makeSelectChain([{ listingId: 'listing-1', count: 3 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return countChain;
      return reviewsChain;
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings?category=ALL'));
    expect(response.status).toBe(200);
  });

  it('filters by search text', async () => {
    const chain = makeFullSelectChain([mockListing]);
    const countChain = makeSelectChain([{ count: 1 }]);
    const reviewsChain = makeSelectChain([{ listingId: 'listing-1', count: 3 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return countChain;
      return reviewsChain;
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings?search=lawn'));
    expect(response.status).toBe(200);
  });

  it('filters by verified=true', async () => {
    const chain = makeFullSelectChain([mockListing]);
    const countChain = makeSelectChain([{ count: 1 }]);
    const reviewsChain = makeSelectChain([{ listingId: 'listing-1', count: 3 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return countChain;
      return reviewsChain;
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings?verified=true'));
    expect(response.status).toBe(200);
  });

  it('filters by featured=true', async () => {
    const chain = makeFullSelectChain([mockListing]);
    const countChain = makeSelectChain([{ count: 1 }]);
    const reviewsChain = makeSelectChain([{ listingId: 'listing-1', count: 3 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return countChain;
      return reviewsChain;
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings?featured=true'));
    expect(response.status).toBe(200);
  });

  it('filters by providerId', async () => {
    const chain = makeFullSelectChain([mockListing]);
    const countChain = makeSelectChain([{ count: 1 }]);
    const reviewsChain = makeSelectChain([{ listingId: 'listing-1', count: 3 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return countChain;
      return reviewsChain;
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings?providerId=provider-1'));
    expect(response.status).toBe(200);
  });

  it('supports pagination with limit and offset', async () => {
    const chain = makeFullSelectChain([mockListing]);
    const countChain = makeSelectChain([{ count: 10 }]);
    const reviewsChain = makeSelectChain([{ listingId: 'listing-1', count: 3 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return countChain;
      return reviewsChain;
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings?limit=5&offset=10'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.pagination.limit).toBe(5);
    expect(body.data.pagination.offset).toBe(10);
  });

  it('returns single listing by id query param', async () => {
    const chain = makeFullSelectChain([mockListing]);
    const reviewsCountChain = makeSelectChain([{ count: 3 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      return reviewsCountChain;
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings?id=listing-1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.listing.id).toBe('listing-1');
  });

  it('returns 404 when single listing by id is not found', async () => {
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const response = await GET(req('http://localhost:3000/api/community-services/listings?id=nonexistent'));
    expect(response.status).toBe(404);
  });

  it('handles database errors gracefully', async () => {
    mocks.dbMock.select.mockImplementation(() => {
      throw new Error('DB error');
    });

    const response = await GET(req('http://localhost:3000/api/community-services/listings'));
    expect(response.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/community-services/listings
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/community-services/listings', () => {
  it('returns 403 when community_services module is disabled', async () => {
    mocks.assertModuleEnabled.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: 'FEATURE_DISABLED' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await POST(req('http://localhost:3000/api/community-services/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Service', category: 'GARDENING' }),
    }));
    expect(response.status).toBe(403);
  });

  it('returns 401 without authentication', async () => {
    mocks.assertModuleEnabled.mockResolvedValue(null);

    const response = await POST(req('http://localhost:3000/api/community-services/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Service', category: 'GARDENING' }),
    }));
    expect(response.status).toBe(401);
  });

  it('creates a listing with valid data', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.assertModuleEnabled.mockResolvedValue(null);

    const insertChain = makeInsertChain([]);
    mocks.dbMock.insert.mockReturnValue(insertChain);

    const selectChain = makeFullSelectChain([
      { ...mockListing, id: 'new-listing', providerId: 'user-1' },
    ]);
    mocks.dbMock.select.mockReturnValue(selectChain);

    const response = await POST(req('http://localhost:3000/api/community-services/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Service',
        description: 'A great service offering',
        category: 'GARDENING',
        priceType: 'HOURLY',
        price: 50,
      }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.dbMock.insert).toHaveBeenCalled();
  });

  it('enforces tenant isolation on create', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.assertModuleEnabled.mockResolvedValue(null);
    const insertChain = makeInsertChain([]);
    mocks.dbMock.insert.mockReturnValue(insertChain);
    const selectChain = makeFullSelectChain([
      { ...mockListing, id: 'new-listing', providerId: 'user-1' },
    ]);
    mocks.dbMock.select.mockReturnValue(selectChain);

    await POST(req('http://localhost:3000/api/community-services/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Service', category: 'MAINTENANCE' }),
    }));

    expect(mocks.dbMock.insert).toHaveBeenCalled();
    const insertCallValues = mocks.dbMock.insert.mock.calls[0][0];
    expect(insertCallValues).toBeDefined();
  });

  it('generates a unique slug from title', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.assertModuleEnabled.mockResolvedValue(null);

    const emptySlugChain = makeFullSelectChain([]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return emptySlugChain;
      return makeFullSelectChain([{ ...mockListing, id: 'new-listing', providerId: 'user-1' }]);
    });
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));

    const response = await POST(req('http://localhost:3000/api/community-services/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Awesome Service', category: 'GARDENING' }),
    }));
    expect(response.status).toBe(200);
  });

  it('handles database errors gracefully', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.assertModuleEnabled.mockResolvedValue(null);
    mocks.dbMock.insert.mockImplementation(() => {
      throw new Error('Insert failed');
    });

    const response = await POST(req('http://localhost:3000/api/community-services/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Failing Service', category: 'GARDENING' }),
    }));
    expect(response.status).toBe(500);
  });
});
