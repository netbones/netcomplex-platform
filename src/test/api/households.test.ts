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
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: { select: vi.fn() },
  apiSuccess: vi.fn((data: unknown, _meta?: unknown, status?: number) =>
    Response.json({ success: true, data }, { status: status ?? 200 })
  ),
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
  apiInternalError: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: message || 'Internal server error' },
      },
      { status: 500 }
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
  households: {
    id: 'id',
    tenantId: 'tenantId',
    propertyId: 'propertyId',
    status: 'status',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
  },
  properties: {
    id: 'id',
    street: 'street',
    unit: 'unit',
    homeImage: 'homeImage',
    platformAddress: 'platformAddress',
  },
  standardSeats: {
    id: 'id',
    userId: 'userId',
    propertyId: 'propertyId',
    tenantId: 'tenantId',
    isPrimaryOwner: 'isPrimaryOwner',
  },
  profiles: {
    id: 'id',
    householdId: 'householdId',
    tenantId: 'tenantId',
  },
  users: {
    id: 'id',
    role: 'role',
    name: 'name',
    email: 'email',
  },
  apiSuccess: mocks.apiSuccess,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiInternalError: mocks.apiInternalError,
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return { ...actual, logError: vi.fn() };
});

import { GET } from '@/app/api/households/route';
import { makeSelectChain } from './helpers';

describe('Households API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = { user: { id: 'test-user' } };
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    mocks.sessionResult = null;

    const response = await GET(new Request('http://localhost:3000/api/households') as any);

    expect(response.status).toBe(401);
  });

  it('returns 403 for RESIDENT role', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

    const response = await GET(new Request('http://localhost:3000/api/households') as any);

    expect(response.status).toBe(403);
  });

  it('returns empty list when no households exist', async () => {
    let callIndex = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeSelectChain([{ role: 'ADMIN' }]);
      return makeSelectChain([]);
    });

    const response = await GET(new Request('http://localhost:3000/api/households') as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.households).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it('returns households with occupant counts and primary owners', async () => {
    let callIndex = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeSelectChain([{ role: 'ADMIN' }]);
      if (callIndex === 2) return makeSelectChain([{ total: 1 }]);
      if (callIndex === 3)
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
      if (callIndex === 4) return makeSelectChain([{ count: 2 }]);
      if (callIndex === 5) return makeSelectChain([{ count: 1 }]);
      if (callIndex === 6)
        return makeSelectChain([
          { id: 'user-1', name: 'John Doe', email: 'john@test.com' },
        ]);
      return makeSelectChain([]);
    });

    const response = await GET(new Request('http://localhost:3000/api/households') as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.households).toHaveLength(1);
    expect(body.data.households[0].id).toBe('hh-1');
    expect(body.data.households[0].occupantCount).toBe(3);
    expect(body.data.households[0].primaryOwner).toEqual({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@test.com',
    });
    expect(body.data.total).toBe(1);
    expect(body.data.page).toBe(1);
    expect(body.data.limit).toBe(20);
  });

  it('filters by search query on street', async () => {
    let callIndex = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeSelectChain([{ role: 'ADMIN' }]);
      if (callIndex === 2) return makeSelectChain([{ total: 2 }]);
      if (callIndex === 3)
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
          {
            id: 'hh-2',
            propertyId: 'prop-2',
            street: '456 Oak Ave',
            unit: 'B2',
            homeImage: null,
            platformAddress: '456-oak-ave@soralia.org',
            status: 'ACTIVE',
            createdAt: new Date('2026-01-02'),
          },
        ]);
      if (callIndex === 4) return makeSelectChain([{ count: 1 }]);
      if (callIndex === 5) return makeSelectChain([{ count: 1 }]);
      if (callIndex === 6) return makeSelectChain([{ count: 0 }]);
      if (callIndex === 7) return makeSelectChain([{ count: 0 }]);
      if (callIndex === 8)
        return makeSelectChain([
          { id: 'user-1', name: 'Alice Smith', email: 'alice@test.com' },
        ]);
      if (callIndex === 9)
        return makeSelectChain([
          { id: 'user-2', name: 'Bob Jones', email: 'bob@test.com' },
        ]);
      return makeSelectChain([]);
    });

    const response = await GET(new Request('http://localhost:3000/api/households?search=oak') as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.households).toHaveLength(1);
    expect(body.data.households[0].street).toBe('456 Oak Ave');
  });

  it('filters by primary owner name', async () => {
    let callIndex = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeSelectChain([{ role: 'ADMIN' }]);
      if (callIndex === 2) return makeSelectChain([{ total: 2 }]);
      if (callIndex === 3)
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
          {
            id: 'hh-2',
            propertyId: 'prop-2',
            street: '456 Oak Ave',
            unit: 'B2',
            homeImage: null,
            platformAddress: '456-oak-ave@soralia.org',
            status: 'ACTIVE',
            createdAt: new Date('2026-01-02'),
          },
        ]);
      if (callIndex === 4) return makeSelectChain([{ count: 1 }]);
      if (callIndex === 5) return makeSelectChain([{ count: 1 }]);
      if (callIndex === 6) return makeSelectChain([{ count: 0 }]);
      if (callIndex === 7) return makeSelectChain([{ count: 0 }]);
      if (callIndex === 8)
        return makeSelectChain([
          { id: 'user-1', name: 'Alice Smith', email: 'alice@test.com' },
        ]);
      if (callIndex === 9)
        return makeSelectChain([
          { id: 'user-2', name: 'Bob Jones', email: 'bob@test.com' },
        ]);
      return makeSelectChain([]);
    });

    const response = await GET(new Request('http://localhost:3000/api/households?search=alice') as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.households).toHaveLength(1);
    expect(body.data.households[0].primaryOwner.name).toBe('Alice Smith');
  });

  it('applies pagination parameters', async () => {
    let callIndex = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeSelectChain([{ role: 'ADMIN' }]);
      if (callIndex === 2) return makeSelectChain([{ total: 25 }]);
      if (callIndex === 3)
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
      if (callIndex === 4) return makeSelectChain([{ count: 1 }]);
      if (callIndex === 5) return makeSelectChain([{ count: 0 }]);
      if (callIndex === 6)
        return makeSelectChain([
          { id: 'user-1', name: 'Owner', email: 'owner@test.com' },
        ]);
      return makeSelectChain([]);
    });

    const response = await GET(
      new Request('http://localhost:3000/api/households?page=2&limit=5') as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.page).toBe(2);
    expect(body.data.limit).toBe(5);
    expect(body.data.total).toBe(25);
  });

  it('caps limit at 50', async () => {
    let callIndex = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeSelectChain([{ role: 'ADMIN' }]);
      if (callIndex === 2) return makeSelectChain([{ total: 100 }]);
      if (callIndex === 3) return makeSelectChain([]);
      return makeSelectChain([]);
    });

    const response = await GET(
      new Request('http://localhost:3000/api/households?page=1&limit=999') as any as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.limit).toBe(50);
  });

  it('handles household with no primary owner', async () => {
    let callIndex = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeSelectChain([{ role: 'ADMIN' }]);
      if (callIndex === 2) return makeSelectChain([{ total: 1 }]);
      if (callIndex === 3)
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
      if (callIndex === 4) return makeSelectChain([{ count: 0 }]);
      if (callIndex === 5) return makeSelectChain([{ count: 0 }]);
      if (callIndex === 6) return makeSelectChain([]);
      return makeSelectChain([]);
    });

    const response = await GET(new Request('http://localhost:3000/api/households') as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.households[0].occupantCount).toBe(0);
    expect(body.data.households[0].primaryOwner).toBeNull();
  });
});
