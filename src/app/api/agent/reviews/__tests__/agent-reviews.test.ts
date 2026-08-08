import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  authResult: { success: true, data: { userId: 'user-1', role: 'RESIDENT' } },
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@api/server', () => ({
  CACHE_TAGS: { SETTINGS: 'settings' },
  auth: {
    api: {
      getSession: () => Promise.resolve({ user: { id: 'user-1' } }),
    },
  },
  db: mocks.dbMock,
  agentProfiles: {
    id: 'id',
    agentId: 'agentId',
    tenantId: 'tenantId',
    rating: 'rating',
    reviewCount: 'reviewCount',
    updatedAt: 'updatedAt',
    __brand: 'table',
  },
  agentReviews: {
    id: 'id',
    tenantId: 'tenantId',
    agentProfileId: 'agentProfileId',
    reviewerId: 'reviewerId',
    rating: 'rating',
    title: 'title',
    comment: 'comment',
    serviceDate: 'serviceDate',
    responseQuality: 'responseQuality',
    isPublished: 'isPublished',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    __brand: 'table',
  },
  users: { id: 'id', role: 'role', name: 'name', avatar: 'avatar' },
  now: () => new Date(),
  notDeleted: vi.fn((t: { deletedAt: string }) => ({ isNull: [t, 'deletedAt'] })),
  requireAuth: vi.fn(() => Promise.resolve(mocks.authResult)),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string, status: number) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    () =>
      new Response(JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiForbidden: vi.fn(
    (message?: string) =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiNotFound: vi.fn(
    (message?: string) =>
      new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiInternalError: vi.fn(
    () =>
      new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
}));

vi.mock('@shared/lib/id', () => ({
  createId: vi.fn(() => 'review-1'),
  createPrefixedId: vi.fn((p: string) => `${p}-x`),
}));

// Helper to chain the drizzle query mock — returns a thenable that is also
// chainable (drizzle builder is awaited by the route handlers).
function mockDb(result: unknown) {
  const query = Promise.resolve(result) as Promise<unknown> & Record<string, () => unknown>;
  query.from = () => query;
  query.where = () => query;
  query.leftJoin = () => query;
  query.orderBy = () => query;
  query.limit = () => query;
  query.offset = () => query;
  query.select = () => query;
  query.values = () => query;
  query.set = () => query;
  query.groupBy = () => query;
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authResult = { success: true, data: { userId: 'user-1', role: 'RESIDENT' } };
});

describe('GET /api/agent/reviews/[agentId]', () => {
  it('lists published reviews with stats when the agent profile exists', async () => {
    mocks.dbMock.select
      // 1st: agent profile lookup
      .mockReturnValueOnce(mockDb([{ id: 'profile-1', agentId: 'agent-1' }]))
      // 2nd: reviews list
      .mockReturnValueOnce(
        mockDb([
          {
            id: 'review-1',
            agentProfileId: 'profile-1',
            reviewerId: 'user-9',
            rating: 5,
            title: 'Great agent',
            comment: 'Very responsive',
            serviceDate: new Date(),
            responseQuality: 5,
            isPublished: true,
            createdAt: new Date(),
            reviewer: { id: 'user-9', name: 'Jane', avatar: 'a.png' },
          },
        ])
      )
      // 3rd: total count
      .mockReturnValueOnce(mockDb([{ count: 1 }]))
      // 4th: rating stats
      .mockReturnValueOnce(mockDb([{ avgRating: 5, avgResponse: 5, count: 1 }]));

    const { GET } = await import('../[agentId]/route');
    const response = await GET(req('http://x/api/agent/reviews/agent-1'), {
      params: Promise.resolve({ agentId: 'agent-1' }),
    } as never);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.reviews).toHaveLength(1);
    expect(body.data.stats.averageRating).toBe(5);
    expect(body.data.stats.totalReviews).toBe(1);
  });

  it('returns 404 when the agent profile does not exist', async () => {
    mocks.dbMock.select.mockReturnValueOnce(mockDb([]));

    const { GET } = await import('../[agentId]/route');
    const response = await GET(req('http://x/api/agent/reviews/ghost'), {
      params: Promise.resolve({ agentId: 'ghost' }),
    } as never);

    expect(response.status).toBe(404);
  });
});

describe('POST /api/agent/reviews/[agentId]', () => {
  it('creates a review and updates the agent profile rating', async () => {
    mocks.dbMock.select
      // 1. agent profile lookup
      .mockReturnValueOnce(mockDb([{ id: 'profile-1', agentId: 'agent-1' }]))
      // 2. existing review check -> none
      .mockReturnValueOnce(mockDb([]))
      // 3. updateAgentRating aggregate stats
      .mockReturnValueOnce(mockDb([{ avgRating: 4, count: 1 }]))
      // 4. fetch created review
      .mockReturnValueOnce(
        mockDb([
          {
            id: 'review-1',
            agentProfileId: 'profile-1',
            reviewerId: 'user-1',
            rating: 4,
            title: 'Good',
            comment: null,
            serviceDate: null,
            responseQuality: 4,
            isPublished: true,
            createdAt: new Date(),
            reviewer: { id: 'user-1', name: 'Bob', avatar: null },
          },
        ])
      );

    mocks.dbMock.insert.mockReturnValue(mockDb(undefined));
    mocks.dbMock.update.mockReturnValue(mockDb(undefined));

    const { POST } = await import('../[agentId]/route');
    const response = await POST(
      req('http://x/api/agent/reviews/agent-1', {
        method: 'POST',
        body: JSON.stringify({ rating: 4, title: 'Good', comment: 'Nice' }),
      }),
      { params: Promise.resolve({ agentId: 'agent-1' }) } as never
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.review.rating).toBe(4);
  });

  it('rejects out-of-range ratings', async () => {
    const { POST } = await import('../[agentId]/route');
    const response = await POST(
      req('http://x/api/agent/reviews/agent-1', {
        method: 'POST',
        body: JSON.stringify({ rating: 9 }),
      }),
      { params: Promise.resolve({ agentId: 'agent-1' }) } as never
    );

    expect(response.status).toBe(400);
    expect(mocks.dbMock.insert).not.toHaveBeenCalled();
  });

  it('rejects self-reviews', async () => {
    mocks.authResult = { success: true, data: { userId: 'agent-1', role: 'RESIDENT' } };
    mocks.dbMock.select.mockReturnValueOnce(mockDb([{ id: 'profile-1', agentId: 'agent-1' }]));

    const { POST } = await import('../[agentId]/route');
    const response = await POST(
      req('http://localhost/api/agent/reviews/agent-1', {
        method: 'POST',
        body: JSON.stringify({ rating: 5 }),
      }),
      { params: Promise.resolve({ agentId: 'agent-1' }) } as never
    );

    expect(response.status).toBe(400);
    expect(mocks.dbMock.insert).not.toHaveBeenCalled();
  });

  it('rejects duplicate reviews by the same reviewer', async () => {
    mocks.dbMock.select
      // agent profile lookup
      .mockReturnValueOnce(mockDb([{ id: 'profile-1', agentId: 'agent-1' }]))
      // existing review check -> found
      .mockReturnValueOnce(mockDb([{ id: 'review-1' }]));

    const { POST } = await import('../[agentId]/route');
    const response = await POST(
      req('http://localhost/api/agent/reviews/agent-1', {
        method: 'POST',
        body: JSON.stringify({ rating: 3 }),
      }),
      { params: Promise.resolve({ agentId: 'agent-1' }) } as never
    );

    expect(response.status).toBe(400);
    expect(mocks.dbMock.insert).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/agent/reviews/[reviewId]', () => {
  it('soft-deletes the review and updates the agent rating when the reviewer owns it', async () => {
    mocks.dbMock.select
      // find review
      .mockReturnValueOnce(
        mockDb([{ id: 'review-1', agentProfileId: 'profile-1', reviewerId: 'user-1' }])
      )
      // updateAgentRating aggregate stats
      .mockReturnValueOnce(mockDb([{ avgRating: 0, count: 0 }]));

    mocks.dbMock.update.mockReturnValue(mockDb(undefined));

    const { DELETE } = await import('../[agentId]/[reviewId]/route');
    const response = await DELETE(
      req('http://localhost/api/agent/reviews/review-1', {
        method: 'DELETE',
      }),
      {
        params: Promise.resolve({ reviewId: 'review-1' }),
      } as never
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(mocks.dbMock.update).toHaveBeenCalled();
  });

  it('returns 403 when a non-reviewer non-admin tries to delete', async () => {
    mocks.authResult = { success: true, data: { userId: 'user-5', role: 'RESIDENT' } };
    mocks.dbMock.select
      // find review -> owned by user-1
      .mockReturnValueOnce(
        mockDb([{ id: 'review-1', agentProfileId: 'profile-1', reviewerId: 'user-1' }])
      )
      // db user lookup -> role RESIDENT
      .mockReturnValueOnce(mockDb([{ id: 'user-5', role: 'RESIDENT' }]));

    const { DELETE } = await import('../[agentId]/[reviewId]/route');
    const response = await DELETE(
      req('http://localhost/api/agent/reviews/review-1', {
        method: 'DELETE',
      }),
      {
        params: Promise.resolve({ reviewId: 'review-1' }),
      } as never
    );

    expect(response.status).toBe(403);
    expect(mocks.dbMock.update).not.toHaveBeenCalled();
  });

  it('returns 404 when review does not exist', async () => {
    mocks.dbMock.select.mockReturnValueOnce(mockDb([]));

    const { DELETE } = await import('../[agentId]/[reviewId]/route');
    const response = await DELETE(
      req('http://localhost/api/agent/reviews/ghost', {
        method: 'DELETE',
      }),
      {
        params: Promise.resolve({ reviewId: 'ghost' }),
      } as never
    );

    expect(response.status).toBe(404);
  });
});
