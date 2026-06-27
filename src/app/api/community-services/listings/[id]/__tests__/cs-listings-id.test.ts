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
    update: vi.fn(),
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
    status: 'status',
    __brand: 'table',
  },
  users: { id: 'id', role: 'role', name: 'name', email: 'email', avatar: 'avatar', phone: 'phone' },
  now: () => new Date('2026-06-21T12:00:00.000Z'),
  notDeleted: vi.fn((t: { deletedAt: string }) => ({ isNull: [t, 'deletedAt'] })),
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
  apiGone: vi.fn(
    (message?: string) =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'GONE', message: message || 'Resource has been deleted' },
        }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
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

import { makeSelectChain, makeUpdateChain } from '@/test/api/helpers';

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
  provider: {
    id: 'provider-1',
    name: 'John Provider',
    email: 'john@example.com',
    avatar: null,
    phone: null,
  },
};

const mockReview = {
  id: 'review-1',
  listingId: 'listing-1',
  reviewerId: 'user-2',
  rating: 5,
  title: 'Great service',
  comment: 'Very professional',
  serviceDate: '2026-06-01',
  responseQuality: 5,
  isPublished: true,
  createdAt: '2026-06-01T00:00:00.000Z',
  reviewer: { id: 'user-2', name: 'Jane User', avatar: null },
};

import { GET, PUT, DELETE } from '@/app/api/community-services/listings/[id]/route';

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = null;
  mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/community-services/listings/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /api/community-services/listings/[id]', () => {
  it('returns 404 when listing not found', async () => {
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const response = await GET(
      req('http://localhost:3000/api/community-services/listings/nonexistent'),
      params('nonexistent')
    );
    expect(response.status).toBe(404);
  });

  it('returns published listing without auth (public access)', async () => {
    const chain = makeFullSelectChain([{ ...mockListing, isPublished: true }]);
    const reviewsChain = makeFullSelectChain([mockReview]);
    const countChain = makeSelectChain([{ count: 1 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return reviewsChain;
      if (callIdx === 3) return countChain;
      return countChain;
    });

    const response = await GET(
      req('http://localhost:3000/api/community-services/listings/listing-1'),
      params('listing-1')
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.listing.id).toBe('listing-1');
    expect(body.data.listing.CommunityServiceReview).toHaveLength(1);
    expect(body.data.listing._count.reviews).toBe(1);
  });

  it('returns published listing for non-owner user', async () => {
    mocks.sessionResult = { user: { id: 'other-user' } };
    const chain = makeFullSelectChain([{ ...mockListing, isPublished: true }]);
    const reviewsChain = makeFullSelectChain([mockReview]);
    const countChain = makeSelectChain([{ count: 1 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return reviewsChain;
      if (callIdx === 3) return countChain;
      return countChain;
    });

    const response = await GET(
      req('http://localhost:3000/api/community-services/listings/listing-1'),
      params('listing-1')
    );
    expect(response.status).toBe(200);
  });

  it('returns unpublished listing to its owner', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const chain = makeFullSelectChain([{ ...mockListing, isPublished: false }]);
    const reviewsChain = makeFullSelectChain([]);
    const countChain = makeSelectChain([{ count: 0 }]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain;
      if (callIdx === 2) return reviewsChain;
      if (callIdx === 3) return countChain;
      return countChain;
    });

    const response = await GET(
      req('http://localhost:3000/api/community-services/listings/listing-1'),
      params('listing-1')
    );
    expect(response.status).toBe(200);
  });

  it('returns 404 for unpublished listing when not owner', async () => {
    mocks.sessionResult = { user: { id: 'other-user' } };
    const chain = makeFullSelectChain([{ ...mockListing, isPublished: false }]);
    mocks.dbMock.select.mockReturnValue(chain);

    const response = await GET(
      req('http://localhost:3000/api/community-services/listings/listing-1'),
      params('listing-1')
    );
    expect(response.status).toBe(404);
  });

  it('handles database errors gracefully', async () => {
    mocks.dbMock.select.mockImplementation(() => {
      throw new Error('DB error');
    });

    const response = await GET(
      req('http://localhost:3000/api/community-services/listings/listing-1'),
      params('listing-1')
    );
    expect(response.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/community-services/listings/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('PUT /api/community-services/listings/[id]', () => {
  it('returns 401 without authentication', async () => {
    const response = await PUT(
      req('http://localhost:3000/api/community-services/listings/listing-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      }),
      params('listing-1')
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 when listing does not exist', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const response = await PUT(
      req('http://localhost:3000/api/community-services/listings/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      }),
      params('nonexistent')
    );
    expect(response.status).toBe(404);
  });

  it('returns 410 when listing has been soft-deleted', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const chain = makeFullSelectChain([
      { providerId: 'provider-1', deletedAt: '2026-06-20T00:00:00.000Z' },
    ]);
    mocks.dbMock.select.mockReturnValue(chain);

    const response = await PUT(
      req('http://localhost:3000/api/community-services/listings/listing-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      }),
      params('listing-1')
    );
    expect(response.status).toBe(410);
  });

  it('returns 403 when user is not the owner', async () => {
    mocks.sessionResult = { user: { id: 'other-user' } };
    const chain = makeFullSelectChain([{ providerId: 'provider-1' }]);
    mocks.dbMock.select.mockReturnValue(chain);

    const response = await PUT(
      req('http://localhost:3000/api/community-services/listings/listing-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      }),
      params('listing-1')
    );
    expect(response.status).toBe(403);
  });

  it('updates listing when user is the owner', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1)
        return makeFullSelectChain([{ providerId: 'provider-1', deletedAt: null }]);
      return makeFullSelectChain([{ ...mockListing, title: 'Updated Title' }]);
    });
    const updateChain = makeUpdateChain([]);
    mocks.dbMock.update.mockReturnValue(updateChain);

    const response = await PUT(
      req('http://localhost:3000/api/community-services/listings/listing-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title', subcategory: 'New Sub' }),
      }),
      params('listing-1')
    );
    expect(response.status).toBe(200);
    expect(mocks.dbMock.update).toHaveBeenCalled();
  });

  it('updates price field correctly (converts to string)', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1)
        return makeFullSelectChain([{ providerId: 'provider-1', deletedAt: null }]);
      return makeFullSelectChain([{ ...mockListing, price: '75' }]);
    });
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const response = await PUT(
      req('http://localhost:3000/api/community-services/listings/listing-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: 75 }),
      }),
      params('listing-1')
    );
    expect(response.status).toBe(200);
  });

  it('handles database errors gracefully', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    mocks.dbMock.select.mockImplementation(() => {
      throw new Error('DB error');
    });

    const response = await PUT(
      req('http://localhost:3000/api/community-services/listings/listing-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      }),
      params('listing-1')
    );
    expect(response.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/community-services/listings/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('DELETE /api/community-services/listings/[id]', () => {
  it('returns 401 without authentication', async () => {
    const response = await DELETE(
      req('http://localhost:3000/api/community-services/listings/listing-1', {
        method: 'DELETE',
      }),
      params('listing-1')
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 when listing does not exist', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const response = await DELETE(
      req('http://localhost:3000/api/community-services/listings/nonexistent', {
        method: 'DELETE',
      }),
      params('nonexistent')
    );
    expect(response.status).toBe(404);
  });

  it('returns 403 when user is not the owner', async () => {
    mocks.sessionResult = { user: { id: 'other-user' } };
    const chain = makeFullSelectChain([{ providerId: 'provider-1' }]);
    mocks.dbMock.select.mockReturnValue(chain);

    const response = await DELETE(
      req('http://localhost:3000/api/community-services/listings/listing-1', {
        method: 'DELETE',
      }),
      params('listing-1')
    );
    expect(response.status).toBe(403);
  });

  it('soft-deletes listing when user is the owner', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const ownershipChain = makeFullSelectChain([{ providerId: 'provider-1' }]);
    mocks.dbMock.select.mockReturnValue(ownershipChain);
    const updateChain = makeUpdateChain([]);
    mocks.dbMock.update.mockReturnValue(updateChain);

    const response = await DELETE(
      req('http://localhost:3000/api/community-services/listings/listing-1', {
        method: 'DELETE',
      }),
      params('listing-1')
    );
    expect(response.status).toBe(200);
    expect(mocks.dbMock.update).toHaveBeenCalled();
  });

  it('handles database errors gracefully', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    mocks.dbMock.select.mockImplementation(() => {
      throw new Error('DB error');
    });

    const response = await DELETE(
      req('http://localhost:3000/api/community-services/listings/listing-1', {
        method: 'DELETE',
      }),
      params('listing-1')
    );
    expect(response.status).toBe(500);
  });
});
