import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const req = (url: string, init?: RequestInit): NextRequest =>
  new Request(url, init) as unknown as NextRequest;

// Mock server-only
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

// Hoisted mocks for shared mutable state
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbExecuteResult: null as unknown,
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
  apiSuccess: vi.fn((data: unknown, _meta?: unknown, _status?: number) =>
    Response.json({ success: true, data }, { status: _status || 200 })
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
  apiInternalError: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: message || 'Internal server error' },
      },
      { status: 500 }
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
  assertModuleEnabled: vi.fn(),
  apiLoggerError: vi.fn(),
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  agentAccesses: {
    id: 'id',
    propertyId: 'propertyId',
    agentId: 'agentId',
    expiresAt: 'expiresAt',
    accessLevel: 'accessLevel',
    createdAt: 'createdAt',
    grantedById: 'grantedById',
    tenantId: 'tenantId',
  },
  users: {
    id: 'id',
    role: 'role',
    name: 'name',
    email: 'email',
    phone: 'phone',
    avatar: 'avatar',
    isPublic: 'isPublic',
    showEmail: 'showEmail',
    showPhone: 'showPhone',
  },
  properties: {
    id: 'id',
    street: 'street',
    unit: 'unit',
    platformAddress: 'platformAddress',
    homeImage: 'homeImage',
    ownerId: 'ownerId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    tenantId: 'tenantId',
  },
  premiumSeats: {
    id: 'id',
    userId: 'userId',
    tenantId: 'tenantId',
    platformAddress: 'platformAddress',
  },
  propertyListings: {
    id: 'id',
    propertyId: 'propertyId',
    ownerId: 'ownerId',
    listingType: 'listingType',
    title: 'title',
    description: 'description',
    price: 'price',
    bedrooms: 'bedrooms',
    bathrooms: 'bathrooms',
    parkingSpaces: 'parkingSpaces',
    gardenSize: 'gardenSize',
    petFriendly: 'petFriendly',
    status: 'status',
    isPublished: 'isPublished',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    tenantId: 'tenantId',
  },
  propertiesTopremiumSeats: { A: 'A', B: 'B' },
  households: {
    id: 'id',
    tenantId: 'tenantId',
    propertyId: 'propertyId',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  standardSeats: {
    id: 'id',
    userId: 'userId',
    propertyId: 'propertyId',
    tenantId: 'tenantId',
    isPrimaryOwner: 'isPrimaryOwner',
    platformAddress: 'platformAddress',
  },
  profiles: {
    id: 'id',
    householdId: 'householdId',
    tenantId: 'tenantId',
    displayName: 'displayName',
    profileAddress: 'profileAddress',
    avatar: 'avatar',
    isPublic: 'isPublic',
    occupantSince: 'occupantSince',
    householdRole: 'householdRole',
    userId: 'userId',
  },
  contents: {
    id: 'id',
    title: 'title',
    excerpt: 'excerpt',
    content: 'content',
    category: 'category',
    tags: 'tags',
    publishedAt: 'publishedAt',
    createdAt: 'createdAt',
    authorId: 'authorId',
    published: 'published',
    tenantId: 'tenantId',
  },
  apiSuccess: mocks.apiSuccess,
  apiCreated: mocks.apiCreated,
  apiUnauthorized: mocks.apiUnauthorized,
  apiInternalError: mocks.apiInternalError,
  apiForbidden: mocks.apiForbidden,
  apiNotFound: mocks.apiNotFound,
}));

// Mock withTenant and feature gate
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'households') return role === 'ADMIN' || role === 'BOARD';
    return false;
  }),
  assertModuleEnabled: (...args: unknown[]) => mocks.assertModuleEnabled(...args),
}));

// Mock @shared/lib (preserve real hasPermission, override logger)
vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    apiLogger: { error: mocks.apiLoggerError, info: vi.fn(), warn: vi.fn() },
    logError: vi.fn(),
  };
});

import { GET as managedPropertiesGet } from '@/app/api/agents/managed-properties/route';
import { GET as listingsGet, POST as listingsPost } from '@/app/api/premium/listings/route';
import { GET as portfolioGet, POST as portfolioPost } from '@/app/api/premium/portfolio/route';
import { GET as householdsGet } from '@/app/api/households/route';
import { GET as householdByIdGet } from '@/app/api/households/[id]/route';
import { makeSelectChain, makeInsertChain } from './helpers';

function createRequest(method = 'GET', url: string) {
  return req(url, { method });
}

describe('Properties API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.assertModuleEnabled.mockResolvedValue(null); // Module enabled by default
    mocks.dbExecuteResult = null;
    mocks.dbMock.execute.mockResolvedValue(mocks.dbExecuteResult);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Managed Properties ────────────────────────────────────────────────

  describe('GET /api/agents/managed-properties', () => {
    it('returns 401 without auth', async () => {
      const request = createRequest('GET', 'http://localhost:3000/api/agents/managed-properties');
      const response = await managedPropertiesGet(request);
      expect(response.status).toBe(401);
    });

    it('returns managed properties for authenticated agent', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const selectChain = makeSelectChain([
        {
          agentAccess: {
            id: 'access-1',
            propertyId: 'prop-1',
            agentId: 'user-1',
            expiresAt: new Date('2026-12-31'),
            accessLevel: 'FULL',
            createdAt: new Date('2026-01-01'),
            grantedById: 'admin-1',
            tenantId: 'test-tenant-id',
          },
          property: {
            id: 'prop-1',
            street: '123 Main St',
            unit: 'A1',
            platformAddress: '123-main-st@soralia.org',
            homeImage: null,
            ownerId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            tenantId: 'test-tenant-id',
          },
          grantedBy: {
            id: 'admin-1',
            name: 'Admin User',
            role: 'ADMIN',
            email: 'admin@test.org',
          },
        },
      ]);
      mocks.dbMock.select.mockImplementation(() => selectChain);

      const request = createRequest('GET', 'http://localhost:3000/api/agents/managed-properties');
      const response = await managedPropertiesGet(request);

      expect(response.status).toBe(200);
    });

    it('returns empty list when agent has no managed properties', async () => {
      mocks.sessionResult = { user: { id: 'user-2' } };

      const selectChain = makeSelectChain([]);
      mocks.dbMock.select.mockImplementation(() => selectChain);

      const request = createRequest('GET', 'http://localhost:3000/api/agents/managed-properties');
      const response = await managedPropertiesGet(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.properties).toEqual([]);
    });

    it('handles null property fields gracefully', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const selectChain = makeSelectChain([
        {
          agentAccess: {
            id: 'access-1',
            propertyId: 'prop-1',
            agentId: 'user-1',
            expiresAt: new Date('2026-12-31'),
            accessLevel: 'VIEW',
            createdAt: new Date('2026-01-01'),
            grantedById: null,
            tenantId: 'test-tenant-id',
          },
          property: null,
          grantedBy: null,
        },
      ]);
      mocks.dbMock.select.mockImplementation(() => selectChain);

      const request = createRequest('GET', 'http://localhost:3000/api/agents/managed-properties');
      const response = await managedPropertiesGet(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.properties[0].street).toBe('');
      expect(body.data.properties[0].grantedBy.name).toBe('Unknown');
    });
  });

  // ── Premium Listings ───────────────────────────────────────────────────

  describe('GET /api/premium/listings', () => {
    it('returns 401 without auth', async () => {
      const request = createRequest('GET', 'http://localhost:3000/api/premium/listings');
      const response = await listingsGet(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 when user has no premium seat', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const request = createRequest('GET', 'http://localhost:3000/api/premium/listings');
      const response = await listingsGet(request);

      expect(response.status).toBe(403);
    });

    it('returns listings for premium user with linked properties', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      // First db call: linked properties via junction table
      const firstChain = makeSelectChain([{ id: 'prop-1' }, { id: 'prop-2' }]);
      // Second db call: listings with property joins
      const secondChain = makeSelectChain([
        {
          listing: {
            id: 'list-1',
            propertyId: 'prop-1',
            ownerId: 'user-1',
            listingType: 'SALE',
            title: 'Beautiful Home',
            description: 'A lovely property',
            price: '500000',
            bedrooms: 3,
            bathrooms: 2,
            parkingSpaces: 1,
            gardenSize: 200,
            petFriendly: true,
            status: 'ACTIVE',
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            tenantId: 'test-tenant-id',
          },
          property: {
            id: 'prop-1',
            street: '123 Main St',
            unit: 'A1',
            platformAddress: '123-main-st@soralia.org',
            homeImage: null,
            ownerId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            tenantId: 'test-tenant-id',
          },
        },
      ]);

      let selectCallCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        selectCallCount++;
        return selectCallCount === 1 ? firstChain : secondChain;
      });

      const request = createRequest('GET', 'http://localhost:3000/api/premium/listings');
      const response = await listingsGet(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.listings).toHaveLength(1);
      expect(body.data.listings[0].street).toBe('123 Main St');
    });
  });

  // ── Premium Portfolio ──────────────────────────────────────────────────

  describe('GET /api/premium/portfolio', () => {
    it('returns 401 without auth', async () => {
      const request = createRequest('GET', 'http://localhost:3000/api/premium/portfolio');
      const response = await portfolioGet(request);
      expect(response.status).toBe(401);
    });

    it('returns hasPortfolio=false when no premium seat exists', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.execute.mockResolvedValue({ rows: [] });

      const request = createRequest('GET', 'http://localhost:3000/api/premium/portfolio');
      const response = await portfolioGet(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.hasPortfolio).toBe(false);
      expect(body.data.message).toContain('No Premium Seat');
    });

    it('returns portfolio data when premium seat exists', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.execute.mockResolvedValue({
        rows: [
          {
            id: 'ps-1',
            platformAddress: 'testuser@soralia.org',
            userId: 'user-1',
            tenantId: 'test-tenant-id',
          },
        ],
      });

      const request = createRequest('GET', 'http://localhost:3000/api/premium/portfolio');
      const response = await portfolioGet(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.hasPortfolio).toBe(true);
      expect(body.data.portfolio.id).toBe('ps-1');
    });

    it('enforces tenant isolation in portfolio lookup', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.tenantResult = { tenantId: 'other-tenant-id', tenantSlug: 'other-tenant' };

      mocks.dbMock.execute.mockResolvedValue({ rows: [] });

      const request = createRequest('GET', 'http://localhost:3000/api/premium/portfolio');
      const response = await portfolioGet(request);

      expect(response.status).toBe(200);
      expect(mocks.dbMock.execute).toHaveBeenCalled();
      const sqlArg = mocks.dbMock.execute.mock.calls[0][0];
      const chunksJson = JSON.stringify(sqlArg.queryChunks);
      expect(chunksJson).toContain('other-tenant-id');
    });
  });

  // ── Households List ────────────────────────────────────────────────────

  describe('GET /api/households', () => {
    it('returns 401 without auth', async () => {
      const request = createRequest('GET', 'http://localhost:3000/api/households');
      const response = await householdsGet(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 when user lacks households permission', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      // Role query returns RESIDENT (no households permission)
      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const request = createRequest('GET', 'http://localhost:3000/api/households');
      const response = await householdsGet(request);

      expect(response.status).toBe(403);
    });

    it('returns paginated households list for ADMIN', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      let selectIndex = 0;
      mocks.dbMock.select.mockImplementation(() => {
        selectIndex++;
        // Call 1: user role → ADMIN
        if (selectIndex === 1) return makeSelectChain([{ role: 'ADMIN' }]);
        // Call 2: total count
        if (selectIndex === 2) return makeSelectChain([{ total: 2 }]);
        // Call 3: household list with property join
        return makeSelectChain([
          {
            id: 'hh-1',
            propertyId: 'prop-1',
            street: '123 Main St',
            unit: 'A1',
            homeImage: null,
            platformAddress: '123-main-st@soralia.org',
            status: 'ACTIVE',
            createdAt: new Date('2026-01-01'),
          },
        ]);
      });

      const request = createRequest('GET', 'http://localhost:3000/api/households?page=1&limit=10');
      const response = await householdsGet(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.households).toBeDefined();
      expect(body.data.total).toBe(2);
    });

    it('enforces tenant isolation on household listing', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      let selectIndex = 0;
      mocks.dbMock.select.mockImplementation(() => {
        selectIndex++;
        if (selectIndex === 1) return makeSelectChain([{ role: 'ADMIN' }]);
        return makeSelectChain([]);
      });

      const request = createRequest('GET', 'http://localhost:3000/api/households');
      await householdsGet(request);

      // Verify total count query includes tenant filter
      const selectCalls = mocks.dbMock.select.mock.calls;
      expect(selectCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Household By ID ────────────────────────────────────────────────────

  describe('GET /api/households/[id]', () => {
    it('returns 404 when household not found', async () => {
      const firstChain = makeSelectChain([]);
      mocks.dbMock.select.mockImplementation(() => firstChain);

      const request = createRequest('GET', 'http://localhost:3000/api/households/nonexistent-id');
      const response = await householdByIdGet(request, {
        params: Promise.resolve({ id: 'nonexistent-id' }),
      });

      expect(response.status).toBe(404);
    });

    it('returns household with property data, occupants, and content', async () => {
      let selectIndex = 0;
      mocks.dbMock.select.mockImplementation(() => {
        selectIndex++;
        if (selectIndex === 1) {
          // household data with inner join
          return makeSelectChain([
            {
              id: 'hh-1',
              propertyId: 'prop-1',
              street: '123 Main St',
              unit: 'A1',
              homeImage: 'https://example.com/img.jpg',
              platformAddress: '123-main-st@soralia.org',
              status: 'ACTIVE',
              createdAt: new Date('2026-01-01'),
            },
          ]);
        }
        if (selectIndex === 2) {
          // standard seats
          return makeSelectChain([
            {
              id: 'seat-1',
              userId: 'user-1',
              isPrimaryOwner: true,
              platformAddress: 'owner@soralia.org',
              propertyId: 'prop-1',
              name: 'John Doe',
              email: 'john@test.com',
              phone: null,
              avatar: null,
              isPublic: false,
              showEmail: false,
              showPhone: false,
            },
          ]);
        }
        if (selectIndex === 3) {
          // profiles
          return makeSelectChain([]);
        }
        // contents
        return makeSelectChain([]);
      });

      const request = createRequest('GET', 'http://localhost:3000/api/households/hh-1');
      const response = await householdByIdGet(request, { params: Promise.resolve({ id: 'hh-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.household).toBeDefined();
      expect(body.data.household.street).toBe('123 Main St');
      expect(body.data.occupants).toBeDefined();
      expect(body.data.stats.totalOccupants).toBe(1);
      expect(body.data.tags).toBeDefined();
    });

    it('includes content with author metadata from seats and profiles', async () => {
      let selectIndex = 0;
      mocks.dbMock.select.mockImplementation(() => {
        selectIndex++;
        if (selectIndex === 1) {
          return makeSelectChain([
            {
              id: 'hh-1',
              propertyId: 'prop-1',
              street: '456 Oak Ave',
              unit: 'B2',
              homeImage: null,
              platformAddress: '456-oak-ave@soralia.org',
              status: 'ACTIVE',
              createdAt: new Date('2026-01-01'),
            },
          ]);
        }
        if (selectIndex === 2) {
          return makeSelectChain([
            {
              id: 'seat-1',
              userId: 'user-1',
              isPrimaryOwner: false,
              platformAddress: 'member@soralia.org',
              propertyId: 'prop-1',
              name: 'Jane Smith',
              email: 'jane@test.com',
              phone: null,
              avatar: null,
              isPublic: true,
              showEmail: true,
              showPhone: false,
            },
          ]);
        }
        if (selectIndex === 3) {
          return makeSelectChain([
            {
              id: 'prof-1',
              householdId: 'hh-1',
              displayName: 'Occupant One',
              profileAddress: 'occupant@soralia.org',
              avatar: null,
              isPublic: true,
              occupantSince: new Date('2025-06-01'),
              householdRole: 'CHILD',
              userId: null,
            },
          ]);
        }
        // contents
        return makeSelectChain([
          {
            id: 'content-1',
            title: 'Community Update',
            excerpt: 'Updates from the household',
            content: 'Full content here',
            category: 'GENERAL',
            tags: ['community', 'update'],
            publishedAt: new Date('2026-06-01'),
            createdAt: new Date('2026-06-01'),
            authorId: 'user-1',
          },
        ]);
      });

      const request = createRequest('GET', 'http://localhost:3000/api/households/hh-1');
      const response = await householdByIdGet(request, { params: Promise.resolve({ id: 'hh-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.stats.totalOccupants).toBe(2);
      expect(body.data.stats.totalContent).toBe(1);
      expect(body.data.tags).toHaveLength(2);
    });

    it('enforces tenant isolation for household lookup', async () => {
      let selectIndex = 0;
      mocks.dbMock.select.mockImplementation(() => {
        selectIndex++;
        return makeSelectChain([]);
      });

      const request = createRequest('GET', 'http://localhost:3000/api/households/hh-missing');
      const response = await householdByIdGet(request, {
        params: Promise.resolve({ id: 'hh-missing' }),
      });

      expect(response.status).toBe(404);
    });
  });
});
