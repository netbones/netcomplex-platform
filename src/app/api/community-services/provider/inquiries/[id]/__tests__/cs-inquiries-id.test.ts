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
    __brand: 'table',
  },
  communityServiceInquiries: {
    id: 'id',
    listingId: 'listingId',
    inquirerId: 'inquirerId',
    tenantId: 'tenantId',
    serviceType: 'serviceType',
    preferredDate: 'preferredDate',
    preferredTime: 'preferredTime',
    location: 'location',
    description: 'description',
    contactMethod: 'contactMethod',
    status: 'status',
    providerResponse: 'providerResponse',
    respondedAt: 'respondedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
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
  chain.innerJoin = vi.fn(() => chain);
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

const mockInquiry = {
  id: 'inquiry-1',
  listingId: 'listing-1',
  inquirerId: 'user-2',
  serviceType: null,
  preferredDate: null,
  preferredTime: null,
  location: null,
  description: 'I need lawn mowing services',
  contactMethod: 'PLATFORM_MESSAGE',
  status: 'PENDING',
  providerResponse: null,
  respondedAt: null,
  createdAt: '2026-06-15T00:00:00.000Z',
  listing: {
    id: 'listing-1',
    title: 'Lawn Mowing Service',
    category: 'GARDENING',
  },
  inquirer: {
    id: 'user-2',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
  },
};

const mockRespondedInquiry = {
  ...mockInquiry,
  status: 'RESPONDED',
  providerResponse: 'I can help with that',
  respondedAt: '2026-06-20T00:00:00.000Z',
};

import { GET, POST } from '@/app/api/community-services/provider/inquiries/[id]/route';

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
// GET /api/community-services/provider/inquiries/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /api/community-services/provider/inquiries', () => {
  it('returns 401 without authentication', async () => {
    const response = await GET(
      req('http://localhost:3000/api/community-services/provider/inquiries/inquiry-1')
    );
    expect(response.status).toBe(401);
  });

  it('returns empty inquiries when provider has no listings', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const response = await GET(
      req('http://localhost:3000/api/community-services/provider/inquiries/inquiry-1')
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.inquiries).toEqual([]);
    expect(body.data.pagination.total).toBe(0);
  });

  it('returns inquiries for provider listings', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ id: 'listing-1' }]);
      if (callIdx === 2) return makeFullSelectChain([mockInquiry]);
      return makeSelectChain([{ count: 1 }]);
    });

    const response = await GET(
      req('http://localhost:3000/api/community-services/provider/inquiries/inquiry-1')
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.inquiries).toHaveLength(1);
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

    const response = await GET(
      req(
        'http://localhost:3000/api/community-services/provider/inquiries/inquiry-1?status=RESPONDED'
      )
    );
    expect(response.status).toBe(200);
  });

  it('supports pagination with limit and offset', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ id: 'listing-1' }]);
      if (callIdx === 2) return makeFullSelectChain([mockInquiry]);
      return makeSelectChain([{ count: 5 }]);
    });

    const response = await GET(
      req(
        'http://localhost:3000/api/community-services/provider/inquiries/inquiry-1?limit=10&offset=0'
      )
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.pagination.limit).toBe(10);
  });

  it('returns empty when no inquiries exist for provider listings', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ id: 'listing-1' }]);
      if (callIdx === 2) return makeFullSelectChain([]);
      return makeSelectChain([{ count: 0 }]);
    });

    const response = await GET(
      req('http://localhost:3000/api/community-services/provider/inquiries/inquiry-1')
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.inquiries).toEqual([]);
  });

  it('handles database errors gracefully', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    mocks.dbMock.select.mockImplementation(() => {
      throw new Error('DB error');
    });

    const response = await GET(
      req('http://localhost:3000/api/community-services/provider/inquiries/inquiry-1')
    );
    expect(response.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/community-services/provider/inquiries/[id] — respond to inquiry
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/community-services/provider/inquiries/[id] (respond)', () => {
  it('returns 401 without authentication', async () => {
    const response = await POST(
      req('http://localhost:3000/api/community-services/provider/inquiries/inquiry-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'I can help', status: 'RESPONDED' }),
      }),
      params('inquiry-1')
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 when inquiry not found', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    const chain = makeFullSelectChain([]);
    mocks.dbMock.select.mockReturnValue(chain);

    const response = await POST(
      req('http://localhost:3000/api/community-services/provider/inquiries/nonexistent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'Hi', status: 'RESPONDED' }),
      }),
      params('nonexistent')
    );
    expect(response.status).toBe(404);
  });

  it('returns 403 when user is not the listing provider', async () => {
    mocks.sessionResult = { user: { id: 'wrong-provider' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ id: 'inquiry-1', listingId: 'listing-1' }]);
      if (callIdx === 2) return makeFullSelectChain([{ providerId: 'correct-provider' }]);
      return makeFullSelectChain([]);
    });

    const response = await POST(
      req('http://localhost:3000/api/community-services/provider/inquiries/inquiry-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'I can help', status: 'RESPONDED' }),
      }),
      params('inquiry-1')
    );
    expect(response.status).toBe(403);
  });

  it('responds to inquiry when provider owns the listing', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ id: 'inquiry-1', listingId: 'listing-1' }]);
      if (callIdx === 2) return makeFullSelectChain([{ providerId: 'provider-1' }]);
      if (callIdx === 3) return makeFullSelectChain([mockRespondedInquiry]);
      return makeFullSelectChain([]);
    });
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const response = await POST(
      req('http://localhost:3000/api/community-services/provider/inquiries/inquiry-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'I can help with that', status: 'RESPONDED' }),
      }),
      params('inquiry-1')
    );
    expect(response.status).toBe(200);
    expect(mocks.dbMock.update).toHaveBeenCalled();
  });

  it('defaults to RESPONDED status when status is omitted', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    let callIdx = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return makeFullSelectChain([{ id: 'inquiry-1', listingId: 'listing-1' }]);
      if (callIdx === 2) return makeFullSelectChain([{ providerId: 'provider-1' }]);
      if (callIdx === 3) return makeFullSelectChain([mockRespondedInquiry]);
      return makeFullSelectChain([]);
    });
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const response = await POST(
      req('http://localhost:3000/api/community-services/provider/inquiries/inquiry-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'Sure, let me check availability' }),
      }),
      params('inquiry-1')
    );
    expect(response.status).toBe(200);
  });

  it('handles database errors gracefully on outer catch', async () => {
    mocks.sessionResult = { user: { id: 'provider-1' } };
    mocks.dbMock.select.mockImplementation(() => {
      throw new Error('DB error');
    });

    const response = await POST(
      req('http://localhost:3000/api/community-services/provider/inquiries/inquiry-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'Error case', status: 'RESPONDED' }),
      }),
      params('inquiry-1')
    );
    expect(response.status).toBe(500);
  });
});
