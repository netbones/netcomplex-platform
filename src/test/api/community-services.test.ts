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
    update: vi.fn(),
    delete: vi.fn(),
  },
  assertModuleEnabled: vi.fn(),
  hasPermissionResult: true as boolean,
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  communityServiceListings: { id: 'id', __brand: 'table' },
  communityServiceReviews: { id: 'id', __brand: 'table' },
  communityServiceInquiries: { id: 'id', __brand: 'table' },
  users: { id: 'id', role: 'role', name: 'name', email: 'email', phone: 'phone', avatar: 'avatar' },
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

vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  assertModuleEnabled: (...args: unknown[]) => mocks.assertModuleEnabled(...args),
}));

vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  logError: vi.fn(),
  hasPermission: vi.fn(() => mocks.hasPermissionResult),
}));

import { makeSelectChain, makeInsertChain, makeUpdateChain, makeDeleteChain } from './helpers';

/**
 * Extended select chain that properly supports orderBy().limit().offset()
 * chaining after .where(). Every method returns either a thenable (for
 * end-chain methods after where) or the chain itself (for pre-where methods),
 * so that calls like .where().orderBy().limit(10).offset(0) all work.
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
  chain.innerJoin = vi.fn(() => chain);
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

// Listing fixture
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
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  provider: {
    id: 'provider-1',
    name: 'John Provider',
    email: 'john@example.com',
    avatar: null,
  },
};

// ── Import route handlers ─────────────────────────────────────────────────

import {
  GET as listingsGET,
  POST as listingsPOST,
} from '@/app/api/community-services/listings/route';
import {
  GET as listingByIdGET,
  PUT as listingByIdPUT,
  DELETE as listingByIdDELETE,
} from '@/app/api/community-services/listings/[id]/route';
import { POST as publishPOST } from '@/app/api/community-services/listings/[id]/publish/route';
import { GET as relatedGET } from '@/app/api/community-services/listings/related/route';
import {
  GET as reviewsGET,
  POST as reviewsPOST,
} from '@/app/api/community-services/reviews/[listingId]/route';
import {
  GET as inquiriesGET,
  POST as inquiriesPOST,
} from '@/app/api/community-services/inquiries/route';
import {
  GET as providerInquiriesGET,
  POST as providerInquiriesPOST,
} from '@/app/api/community-services/provider/inquiries/[id]/route';
import {
  GET as modGET,
  POST as modPOST,
  PUT as modPUT,
  DELETE as modDELETE,
} from '@/app/api/community-services/moderation/listings/[id]/route';
import { GET as analyticsGET } from '@/app/api/community-services/analytics/route';

// ── Helpers ────────────────────────────────────────────────────────────────

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function listingIdParams(listingId: string) {
  return { params: Promise.resolve({ listingId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = null;
  mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  mocks.assertModuleEnabled.mockResolvedValue(null);
  mocks.hasPermissionResult = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. GET /community-services/listings
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /community-services/listings', () => {
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

    const request = req('http://localhost:3000/api/community-services/listings');
    const response = await listingsGET(request);
    expect(response.status).toBe(403);
  });

  it('returns listings with success envelope', async () => {
    mocks.assertModuleEnabled.mockResolvedValue(null);
    const chain = makeFullSelectChain([mockListing]);
    const countChain = makeSelectChain([{ count: 1 }]);
    let callIndex = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIndex++;
      return callIndex <= 1 ? chain : countChain;
    });

    const request = req('http://localhost:3000/api/community-services/listings');
    const response = await listingsGET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('filters by category query param', async () => {
    mocks.assertModuleEnabled.mockResolvedValue(null);
    const chain = makeFullSelectChain([]);
    const countChain = makeSelectChain([{ count: 0 }]);
    let callIndex = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIndex++;
      return callIndex <= 1 ? chain : countChain;
    });

    const request = req('http://localhost:3000/api/community-services/listings?category=GARDENING');
    const response = await listingsGET(request);
    expect(response.status).toBe(200);
  });

  it('returns single listing when id query param provided', async () => {
    mocks.assertModuleEnabled.mockResolvedValue(null);
    const chain = makeFullSelectChain([mockListing]);
    const countChain = makeSelectChain([{ count: 1 }]);
    let callIndex = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIndex++;
      return callIndex <= 1 ? chain : countChain;
    });

    const request = req('http://localhost:3000/api/community-services/listings?id=listing-1');
    const response = await listingsGET(request);
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. POST /community-services/listings
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /community-services/listings', () => {
  it('returns 403 when community_services module is disabled', async () => {
    mocks.assertModuleEnabled.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: 'FEATURE_DISABLED' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = req('http://localhost:3000/api/community-services/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Service', category: 'GARDENING' }),
    });
    const response = await listingsPOST(request);
    expect(response.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    mocks.assertModuleEnabled.mockResolvedValue(null);

    const request = req('http://localhost:3000/api/community-services/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Service', category: 'GARDENING' }),
    });
    const response = await listingsPOST(request);
    expect(response.status).toBe(401);
  });

  it('creates listing with valid data', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.assertModuleEnabled.mockResolvedValue(null);

    const insertChain = makeInsertChain([]);
    mocks.dbMock.insert.mockReturnValue(insertChain);

    const selectChain = makeFullSelectChain([
      { ...mockListing, id: 'new-listing', providerId: 'user-1' },
    ]);
    mocks.dbMock.select.mockReturnValue(selectChain);

    const request = req('http://localhost:3000/api/community-services/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Service',
        description: 'A great service',
        category: 'GARDENING',
        priceType: 'HOURLY',
        price: 50,
      }),
    });
    const response = await listingsPOST(request);
    expect(response.status).toBe(200);
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

    const request = req('http://localhost:3000/api/community-services/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Another Service',
        category: 'MAINTENANCE',
      }),
    });
    await listingsPOST(request);

    expect(mocks.dbMock.insert).toHaveBeenCalled();
    const insertCallValues = mocks.dbMock.insert.mock.calls[0][0];
    expect(insertCallValues).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. GET /community-services/listings/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /community-services/listings/[id]', () => {
  it('returns 404 when listing not found', async () => {
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req('http://localhost:3000/api/community-services/listings/nonexistent');
    const response = await listingByIdGET(request, params('nonexistent'));
    expect(response.status).toBe(404);
  });

  it('returns published listing without auth (public)', async () => {
    const chain = makeFullSelectChain([
      { ...mockListing, isPublished: true, providerId: 'provider-1' },
    ]);
    let callCount = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callCount++;
      return chain;
    });

    const request = req('http://localhost:3000/api/community-services/listings/listing-1');
    const response = await listingByIdGET(request, params('listing-1'));
    expect(response.status).toBe(200);
  });

  it('returns unpublished listing only to owner', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const chain = makeFullSelectChain([
      { ...mockListing, isPublished: false, providerId: 'provider-1' },
    ]);
    let callCount = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callCount++;
      return chain;
    });

    const request = req('http://localhost:3000/api/community-services/listings/listing-1');
    const response = await listingByIdGET(request, params('listing-1'));
    expect(response.status).toBe(200);
  });

  it('returns 404 for unpublished listing when not owner', async () => {
    mocks.sessionResult = { user: { id: 'other-user' } };
    const chain = makeFullSelectChain([
      { ...mockListing, isPublished: false, providerId: 'provider-1' },
    ]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req('http://localhost:3000/api/community-services/listings/listing-1');
    const response = await listingByIdGET(request, params('listing-1'));
    expect(response.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. PUT /community-services/listings/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('PUT /community-services/listings/[id]', () => {
  it('returns 401 without auth', async () => {
    const request = req('http://localhost:3000/api/community-services/listings/listing-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const response = await listingByIdPUT(request, params('listing-1'));
    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not the owner', async () => {
    mocks.sessionResult = { user: { id: 'other-user' } };
    const ownershipChain = makeFullSelectChain([{ providerId: 'provider-1' }]);
    mocks.dbMock.select.mockReturnValue(ownershipChain);

    const request = req('http://localhost:3000/api/community-services/listings/listing-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const response = await listingByIdPUT(request, params('listing-1'));
    expect(response.status).toBe(403);
  });

  it('returns 404 when listing does not exist', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req('http://localhost:3000/api/community-services/listings/nonexistent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const response = await listingByIdPUT(request, params('nonexistent'));
    expect(response.status).toBe(404);
  });

  it('updates listing when owner', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };

    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ providerId: 'provider-1' }]);
      return makeFullSelectChain([{ ...mockListing, title: 'Updated Title' }]);
    });

    const updateChain = makeUpdateChain([]);
    mocks.dbMock.update.mockReturnValue(updateChain);

    const request = req('http://localhost:3000/api/community-services/listings/listing-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const response = await listingByIdPUT(request, params('listing-1'));
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. DELETE /community-services/listings/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('DELETE /community-services/listings/[id]', () => {
  it('returns 401 without auth', async () => {
    const request = req('http://localhost:3000/api/community-services/listings/listing-1', {
      method: 'DELETE',
    });
    const response = await listingByIdDELETE(request, params('listing-1'));
    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not the owner', async () => {
    mocks.sessionResult = { user: { id: 'other-user' } };
    const chain = makeFullSelectChain([{ providerId: 'provider-1' }]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req('http://localhost:3000/api/community-services/listings/listing-1', {
      method: 'DELETE',
    });
    const response = await listingByIdDELETE(request, params('listing-1'));
    expect(response.status).toBe(403);
  });

  it('returns 404 when listing does not exist', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req('http://localhost:3000/api/community-services/listings/nonexistent', {
      method: 'DELETE',
    });
    const response = await listingByIdDELETE(request, params('nonexistent'));
    expect(response.status).toBe(404);
  });

  it('deletes listing when owner', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const chain = makeFullSelectChain([{ providerId: 'provider-1' }]);
    mocks.dbMock.select.mockReturnValue(chain);
    mocks.dbMock.delete.mockReturnValue(makeDeleteChain());

    const request = req('http://localhost:3000/api/community-services/listings/listing-1', {
      method: 'DELETE',
    });
    const response = await listingByIdDELETE(request, params('listing-1'));
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. POST /community-services/listings/[id]/publish
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /community-services/listings/[id]/publish', () => {
  it('returns 401 without auth', async () => {
    const request = req('http://localhost:3000/api/community-services/listings/listing-1/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publish: true }),
    });
    const response = await publishPOST(request, params('listing-1'));
    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not the owner', async () => {
    mocks.sessionResult = { user: { id: 'other-user' } };
    const chain = makeFullSelectChain([{ providerId: 'provider-1' }]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req('http://localhost:3000/api/community-services/listings/listing-1/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publish: true }),
    });
    const response = await publishPOST(request, params('listing-1'));
    expect(response.status).toBe(403);
  });

  it('returns 404 when listing not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req(
      'http://localhost:3000/api/community-services/listings/nonexistent/publish',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: true }),
      }
    );
    const response = await publishPOST(request, params('nonexistent'));
    expect(response.status).toBe(404);
  });

  it('publishes listing when owner', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };

    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ providerId: 'provider-1' }]);
      return makeFullSelectChain([{ ...mockListing, isPublished: true, status: 'ACTIVE' }]);
    });

    const updateChain = makeUpdateChain([]);
    mocks.dbMock.update.mockReturnValue(updateChain);

    const request = req('http://localhost:3000/api/community-services/listings/listing-1/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publish: true }),
    });
    const response = await publishPOST(request, params('listing-1'));
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. GET /community-services/listings/related
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /community-services/listings/related', () => {
  it('returns 400 when serviceId query param is missing', async () => {
    const request = req('http://localhost:3000/api/community-services/listings/related');
    const response = await relatedGET(request);
    expect(response.status).toBe(400);
  });

  it('returns 404 when service not found', async () => {
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req(
      'http://localhost:3000/api/community-services/listings/related?serviceId=nonexistent'
    );
    const response = await relatedGET(request);
    expect(response.status).toBe(404);
  });

  it('returns related services for valid serviceId (public)', async () => {
    const relatedListing = { ...mockListing, id: 'listing-2', title: 'Another Lawn Service' };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([mockListing]);
      if (callIdx === 2) return makeFullSelectChain([relatedListing]);
      return makeSelectChain([{ count: 1 }]);
    });

    const request = req(
      'http://localhost:3000/api/community-services/listings/related?serviceId=listing-1'
    );
    const response = await relatedGET(request);
    expect(response.status).toBe(200);
  });

  it('supports limit query param', async () => {
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([mockListing]);
      return makeFullSelectChain([]);
    });

    const request = req(
      'http://localhost:3000/api/community-services/listings/related?serviceId=listing-1&limit=2'
    );
    const response = await relatedGET(request);
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. GET /community-services/reviews/[listingId]
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /community-services/reviews/[listingId]', () => {
  it('returns reviews for listing (public)', async () => {
    const reviewsChain = makeFullSelectChain([
      {
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
      },
    ]);
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx <= 2) return reviewsChain;
      return makeSelectChain([{ count: 1, avgRating: 4.5, avgResponse: 4.0 }]);
    });

    const request = req('http://localhost:3000/api/community-services/reviews/listing-1');
    const response = await reviewsGET(request, listingIdParams('listing-1'));
    expect(response.status).toBe(200);
  });

  it('returns empty reviews for listing with no reviews', async () => {
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([]);
      return makeSelectChain([{ count: 0, avgRating: null, avgResponse: null }]);
    });

    const request = req('http://localhost:3000/api/community-services/reviews/listing-1');
    const response = await reviewsGET(request, listingIdParams('listing-1'));
    expect(response.status).toBe(200);
  });

  it('supports pagination with limit and offset', async () => {
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx <= 2) return makeFullSelectChain([]);
      return makeSelectChain([{ count: 0, avgRating: null, avgResponse: null }]);
    });

    const request = req(
      'http://localhost:3000/api/community-services/reviews/listing-1?limit=5&offset=10'
    );
    const response = await reviewsGET(request, listingIdParams('listing-1'));
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. POST /community-services/reviews/[listingId]
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /community-services/reviews/[listingId]', () => {
  it('returns 401 without auth', async () => {
    const request = req('http://localhost:3000/api/community-services/reviews/listing-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 4, title: 'Good', comment: 'Nice work' }),
    });
    const response = await reviewsPOST(request, listingIdParams('listing-1'));
    expect(response.status).toBe(401);
  });

  it('returns 400 when rating is out of range', async () => {
    mocks.sessionResult = { user: { id: 'user-2' } };
    const chain = makeFullSelectChain([
      { id: 'listing-1', isPublished: true, providerId: 'provider-1' },
    ]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req('http://localhost:3000/api/community-services/reviews/listing-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 0, title: 'Bad rating', comment: 'Test' }),
    });
    const response = await reviewsPOST(request, listingIdParams('listing-1'));
    expect(response.status).toBe(400);
  });

  it('returns 400 for self-review (provider reviewing own listing)', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const chain = makeFullSelectChain([
      { id: 'listing-1', isPublished: true, providerId: 'provider-1' },
    ]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req('http://localhost:3000/api/community-services/reviews/listing-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 4, title: 'Good', comment: 'Nice work' }),
    });
    const response = await reviewsPOST(request, listingIdParams('listing-1'));
    expect(response.status).toBe(400);
  });

  it('returns 400 for duplicate review', async () => {
    mocks.sessionResult = { user: { id: 'user-2' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1)
        return makeFullSelectChain([
          { id: 'listing-1', isPublished: true, providerId: 'provider-1' },
        ]);
      if (callIdx === 2) return makeFullSelectChain([{ id: 'existing-review' }]);
      return makeFullSelectChain([]);
    });

    const request = req('http://localhost:3000/api/community-services/reviews/listing-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 4, title: 'Good', comment: 'Nice work' }),
    });
    const response = await reviewsPOST(request, listingIdParams('listing-1'));
    expect(response.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. GET /community-services/inquiries
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /community-services/inquiries', () => {
  it('returns 401 without auth', async () => {
    const request = req('http://localhost:3000/api/community-services/inquiries');
    const response = await inquiriesGET(request);
    expect(response.status).toBe(401);
  });

  it('returns inquiries for authenticated user', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1)
        return makeFullSelectChain([
          {
            id: 'inquiry-1',
            listingId: 'listing-1',
            inquirerId: 'user-1',
            serviceType: null,
            preferredDate: null,
            preferredTime: null,
            location: null,
            description: 'Need help',
            contactMethod: 'PLATFORM_MESSAGE',
            status: 'PENDING',
            providerResponse: null,
            respondedAt: null,
            createdAt: '2026-06-01T00:00:00.000Z',
          },
        ]);
      if (callIdx === 2)
        return makeFullSelectChain([
          { id: 'listing-1', title: 'Service', category: 'GARDENING', providerId: 'provider-1' },
        ]);
      if (callIdx === 3)
        return makeFullSelectChain([{ id: 'provider-1', name: 'John', email: 'john@test.com' }]);
      return makeSelectChain([{ count: 1 }]);
    });

    const request = req('http://localhost:3000/api/community-services/inquiries');
    const response = await inquiriesGET(request);
    expect(response.status).toBe(200);
  });

  it('filters by status query param', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([]);
      return makeSelectChain([{ count: 0 }]);
    });

    const request = req('http://localhost:3000/api/community-services/inquiries?status=PENDING');
    const response = await inquiriesGET(request);
    expect(response.status).toBe(200);
  });

  it('returns empty when user has no inquiries', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([]);
      return makeSelectChain([{ count: 0 }]);
    });

    const request = req('http://localhost:3000/api/community-services/inquiries');
    const response = await inquiriesGET(request);
    const body = await response.json();
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. POST /community-services/inquiries
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /community-services/inquiries', () => {
  it('returns 401 without auth', async () => {
    const request = req('http://localhost:3000/api/community-services/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: 'listing-1', description: 'I need this service' }),
    });
    const response = await inquiriesPOST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 when listingId or description missing', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };

    const request = req('http://localhost:3000/api/community-services/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Missing listingId' }),
    });
    const response = await inquiriesPOST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for self-inquiry', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const chain = makeFullSelectChain([
      { id: 'listing-1', isPublished: true, providerId: 'provider-1' },
    ]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req('http://localhost:3000/api/community-services/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: 'listing-1', description: 'Need my own service' }),
    });
    const response = await inquiriesPOST(request);
    expect(response.status).toBe(400);
  });

  it('creates inquiry with valid data', async () => {
    mocks.sessionResult = { user: { id: 'user-2' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1)
        return makeFullSelectChain([
          { id: 'listing-1', isPublished: true, providerId: 'provider-1' },
        ]);
      if (callIdx === 2)
        return makeFullSelectChain([
          {
            id: 'inquiry-1',
            listingId: 'listing-1',
            inquirerId: 'user-2',
            status: 'PENDING',
            description: 'Need service',
            createdAt: '2026-06-01T00:00:00.000Z',
          },
        ]);
      if (callIdx === 3)
        return makeFullSelectChain([
          { id: 'listing-1', title: 'Service', category: 'GARDENING', providerId: 'provider-1' },
        ]);
      if (callIdx === 4)
        return makeFullSelectChain([{ id: 'provider-1', name: 'John', email: 'john@test.com' }]);
      return makeFullSelectChain([{ id: 'user-2', name: 'Jane', email: 'jane@test.com' }]);
    });
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));

    const request = req('http://localhost:3000/api/community-services/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: 'listing-1', description: 'I need this service' }),
    });
    const response = await inquiriesPOST(request);
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. GET /community-services/provider/inquiries
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /community-services/provider/inquiries', () => {
  it('returns 401 without auth', async () => {
    const request = req('http://localhost:3000/api/community-services/provider/inquiries/some-id');
    const response = await providerInquiriesGET(request);
    expect(response.status).toBe(401);
  });

  it('returns empty inquiries when provider has no listings', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req('http://localhost:3000/api/community-services/provider/inquiries/some-id');
    const response = await providerInquiriesGET(request);
    expect(response.status).toBe(200);
  });

  it('returns inquiries for provider listings', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ id: 'listing-1' }]);
      if (callIdx === 2)
        return makeFullSelectChain([
          {
            id: 'inquiry-1',
            listingId: 'listing-1',
            inquirerId: 'user-2',
            serviceType: null,
            preferredDate: null,
            preferredTime: null,
            location: null,
            description: 'Need help',
            contactMethod: 'PLATFORM_MESSAGE',
            status: 'PENDING',
            providerResponse: null,
            respondedAt: null,
            createdAt: '2026-06-01T00:00:00.000Z',
            listing: { id: 'listing-1', title: 'My Service', category: 'GARDENING' },
            inquirer: { id: 'user-2', name: 'Jane', email: 'jane@test.com', phone: null },
          },
        ]);
      return makeSelectChain([{ count: 1 }]);
    });

    const request = req('http://localhost:3000/api/community-services/provider/inquiries/some-id');
    const response = await providerInquiriesGET(request);
    expect(response.status).toBe(200);
  });

  it('filters by status query param', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ id: 'listing-1' }]);
      if (callIdx === 2) return makeFullSelectChain([]);
      return makeSelectChain([{ count: 0 }]);
    });

    const request = req(
      'http://localhost:3000/api/community-services/provider/inquiries/some-id?status=RESPONDED'
    );
    const response = await providerInquiriesGET(request);
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. POST /community-services/provider/inquiries/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /community-services/provider/inquiries/[id]', () => {
  it('returns 401 without auth', async () => {
    const request = req(
      'http://localhost:3000/api/community-services/provider/inquiries/inquiry-1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'I can help', status: 'RESPONDED' }),
      }
    );
    const response = await providerInquiriesPOST(request, params('inquiry-1'));
    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not the listing provider', async () => {
    mocks.sessionResult = { user: { id: 'wrong-provider' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeSelectChain([{ id: 'inquiry-1', listingId: 'listing-1' }]);
      if (callIdx === 2) return makeFullSelectChain([{ providerId: 'correct-provider' }]);
      return makeFullSelectChain([]);
    });

    const request = req(
      'http://localhost:3000/api/community-services/provider/inquiries/inquiry-1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'I can help', status: 'RESPONDED' }),
      }
    );
    const response = await providerInquiriesPOST(request, params('inquiry-1'));
    expect(response.status).toBe(403);
  });

  it('returns 404 when inquiry not found', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const chain = makeSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const request = req(
      'http://localhost:3000/api/community-services/provider/inquiries/nonexistent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'Hi', status: 'RESPONDED' }),
      }
    );
    const response = await providerInquiriesPOST(request, params('nonexistent'));
    expect(response.status).toBe(404);
  });

  it('responds to inquiry when provider owns listing', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeSelectChain([{ id: 'inquiry-1', listingId: 'listing-1' }]);
      if (callIdx === 2) return makeFullSelectChain([{ providerId: 'provider-1' }]);
      return makeFullSelectChain([
        {
          id: 'inquiry-1',
          listingId: 'listing-1',
          inquirerId: 'user-2',
          serviceType: null,
          preferredDate: null,
          preferredTime: null,
          location: null,
          description: 'Need help',
          contactMethod: 'PLATFORM_MESSAGE',
          status: 'RESPONDED',
          providerResponse: 'I can help',
          respondedAt: '2026-06-10T00:00:00.000Z',
          createdAt: '2026-06-01T00:00:00.000Z',
          listing: { id: 'listing-1', title: 'My Service' },
          inquirer: { id: 'user-2', name: 'Jane', email: 'jane@test.com' },
        },
      ]);
    });
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const request = req(
      'http://localhost:3000/api/community-services/provider/inquiries/inquiry-1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'I can help', status: 'RESPONDED' }),
      }
    );
    const response = await providerInquiriesPOST(request, params('inquiry-1'));
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. GET /community-services/moderation/listings
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /community-services/moderation/listings', () => {
  it('returns 401 without auth', async () => {
    const request = req('http://localhost:3000/api/community-services/moderation/listings/some-id');
    const response = await modGET(request);
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const roleChain = makeFullSelectChain([{ role: 'RESIDENT' }]);
    mocks.dbMock.select.mockReturnValue(roleChain);

    const request = req('http://localhost:3000/api/community-services/moderation/listings/some-id');
    const response = await modGET(request);
    expect(response.status).toBe(403);
  });

  it('returns moderation queue for admin', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'ADMIN' }]);
      if (callIdx === 2) return makeFullSelectChain([{ ...mockListing, status: 'PENDING' }]);
      return makeSelectChain([{ count: 1 }]);
    });

    const request = req('http://localhost:3000/api/community-services/moderation/listings/some-id');
    const response = await modGET(request);
    expect(response.status).toBe(200);
  });

  it('returns moderation queue for BOARD member', async () => {
    mocks.sessionResult = { user: { id: 'board-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'BOARD' }]);
      if (callIdx === 2) return makeFullSelectChain([]);
      return makeSelectChain([{ count: 0 }]);
    });

    const request = req('http://localhost:3000/api/community-services/moderation/listings/some-id');
    const response = await modGET(request);
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. POST /community-services/moderation/listings/[id] — approve
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /community-services/moderation/listings/[id] (approve)', () => {
  it('returns 401 without auth', async () => {
    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Looks good' }),
      }
    );
    const response = await modPOST(request, params('listing-1'));
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const roleChain = makeFullSelectChain([{ role: 'RESIDENT' }]);
    mocks.dbMock.select.mockReturnValue(roleChain);

    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Looks good' }),
      }
    );
    const response = await modPOST(request, params('listing-1'));
    expect(response.status).toBe(403);
  });

  it('approves listing for admin', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'ADMIN' }]);
      return makeFullSelectChain([{ ...mockListing, status: 'ACTIVE', isPublished: true }]);
    });
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved' }),
      }
    );
    const response = await modPOST(request, params('listing-1'));
    expect(response.status).toBe(200);
  });

  it('approves listing for COMMITTEE member', async () => {
    mocks.sessionResult = { user: { id: 'committee-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'COMMITTEE' }]);
      return makeFullSelectChain([{ ...mockListing, status: 'ACTIVE', isPublished: true }]);
    });
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved' }),
      }
    );
    const response = await modPOST(request, params('listing-1'));
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. PUT /community-services/moderation/listings/[id] — reject
// ═══════════════════════════════════════════════════════════════════════════
describe('PUT /community-services/moderation/listings/[id] (reject)', () => {
  it('returns 401 without auth', async () => {
    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Inappropriate', notes: 'Violates policy' }),
      }
    );
    const response = await modPUT(request, params('listing-1'));
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const roleChain = makeFullSelectChain([{ role: 'RESIDENT' }]);
    mocks.dbMock.select.mockReturnValue(roleChain);

    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Inappropriate', notes: 'Violates policy' }),
      }
    );
    const response = await modPUT(request, params('listing-1'));
    expect(response.status).toBe(403);
  });

  it('rejects listing for admin', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'ADMIN' }]);
      return makeFullSelectChain([{ ...mockListing, status: 'WITHDRAWN', isPublished: false }]);
    });
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Inappropriate', notes: 'Violates policy' }),
      }
    );
    const response = await modPUT(request, params('listing-1'));
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17. DELETE /community-services/moderation/listings/[id] — remove
// ═══════════════════════════════════════════════════════════════════════════
describe('DELETE /community-services/moderation/listings/[id] (remove)', () => {
  it('returns 401 without auth', async () => {
    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Violates community guidelines' }),
      }
    );
    const response = await modDELETE(request, params('listing-1'));
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin/board users', async () => {
    mocks.sessionResult = { user: { id: 'committee-1' } };
    const roleChain = makeFullSelectChain([{ role: 'COMMITTEE' }]);
    mocks.dbMock.select.mockReturnValue(roleChain);

    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Bad listing' }),
      }
    );
    const response = await modDELETE(request, params('listing-1'));
    expect(response.status).toBe(403);
  });

  it('removes listing for admin (stricter: ADMIN/BOARD only)', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    const roleChain = makeFullSelectChain([{ role: 'ADMIN' }]);
    mocks.dbMock.select.mockReturnValue(roleChain);
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Violates community guidelines' }),
      }
    );
    const response = await modDELETE(request, params('listing-1'));
    expect(response.status).toBe(200);
  });

  it('removes listing for BOARD member', async () => {
    mocks.sessionResult = { user: { id: 'board-1' } };
    const roleChain = makeFullSelectChain([{ role: 'BOARD' }]);
    mocks.dbMock.select.mockReturnValue(roleChain);
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const request = req(
      'http://localhost:3000/api/community-services/moderation/listings/listing-1',
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Spam listing' }),
      }
    );
    const response = await modDELETE(request, params('listing-1'));
    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 18. GET /community-services/analytics
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /community-services/analytics', () => {
  it('returns 401 without auth', async () => {
    const request = req('http://localhost:3000/api/community-services/analytics');
    const response = await analyticsGET(request);
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin/board/committee users', async () => {
    mocks.sessionResult = { user: { id: 'resident-1' } };
    const roleChain = makeFullSelectChain([{ role: 'RESIDENT' }]);
    mocks.dbMock.select.mockReturnValue(roleChain);

    const request = req('http://localhost:3000/api/community-services/analytics');
    const response = await analyticsGET(request);
    expect(response.status).toBe(403);
  });

  it('returns analytics for admin', async () => {
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
      if (callIdx === 7) return makeFullSelectChain([{ category: 'GARDENING', count: 10 }]);
      if (callIdx === 8) return makeFullSelectChain([]);
      return makeFullSelectChain([{ avgRating: 4.2, count: 50 }]);
    });

    const request = req('http://localhost:3000/api/community-services/analytics');
    const response = await analyticsGET(request);
    expect(response.status).toBe(200);
  });

  it('returns analytics for BOARD member', async () => {
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

    const request = req('http://localhost:3000/api/community-services/analytics');
    const response = await analyticsGET(request);
    expect(response.status).toBe(200);
  });

  it('supports period query param', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ role: 'ADMIN' }]);
      if (callIdx === 2) return makeFullSelectChain([{ count: 25 }]);
      if (callIdx === 3) return makeFullSelectChain([{ count: 20 }]);
      if (callIdx === 4) return makeFullSelectChain([]);
      if (callIdx === 5) return makeFullSelectChain([{ count: 10 }]);
      if (callIdx === 6) return makeFullSelectChain([{ count: 5 }]);
      if (callIdx === 7) return makeFullSelectChain([]);
      if (callIdx === 8) return makeFullSelectChain([]);
      return makeFullSelectChain([{ avgRating: 4.2, count: 50 }]);
    });

    const request = req('http://localhost:3000/api/community-services/analytics?period=7d');
    const response = await analyticsGET(request);
    expect(response.status).toBe(200);
  });
});
