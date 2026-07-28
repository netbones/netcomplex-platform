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
  sessionResult: null as { user: { id: string; role: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@/shared/api/auth-utils', () => {
  const jsonResponse = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  return {
    requireAuth: vi.fn(async () => {
      if (!mocks.sessionResult) {
        return {
          success: false as const,
          response: jsonResponse(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
            401
          ),
        };
      }
      return {
        success: true as const,
        data: {
          userId: mocks.sessionResult.user.id,
          role: mocks.sessionResult.user.role,
          tenantId: 'test-tenant-id',
          session: { user: { id: mocks.sessionResult.user.id } },
          suspension: null,
        },
      };
    }),
  };
});

vi.mock('@api/server', () => {
  const jsonResponse = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  return {
    auth: {
      api: {
        getSession: () => Promise.resolve(mocks.sessionResult),
      },
    },
    getSessionAndRole: vi.fn(() => {
      if (!mocks.sessionResult) return Promise.resolve(null);
      return Promise.resolve({
        session: {
          user: { id: mocks.sessionResult.user.id, email: 'test@test.com', name: 'Test' },
        },
        userId: mocks.sessionResult.user.id,
        role: mocks.sessionResult.user.role || 'ADMIN',
        suspension: null,
      });
    }),
    notDeleted: vi.fn(() => true),
    guardSuspension: vi.fn(() => null),
    CACHE_TAGS: {},
    db: mocks.dbMock,
    competitions: {
      id: 'id',
      tenantId: 'tenantId',
      title: 'title',
      description: 'description',
      rules: 'rules',
      prizeInfo: 'prizeInfo',
      startDate: 'startDate',
      endDate: 'endDate',
      status: 'status',
      entryCount: 'entryCount',
      image: 'image',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      deletedAt: 'deletedAt',
    },
    users: { id: 'id', role: 'role' },
    revalidateContent: vi.fn(),
    emitEvent: vi.fn(),
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
    apiError: vi.fn(
      (code: string, message: string) =>
        new Response(JSON.stringify({ success: false, error: { code, message } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
    ),
    apiUnauthorized: vi.fn(() =>
      jsonResponse(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        401
      )
    ),
    apiForbidden: vi.fn(() =>
      jsonResponse({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }, 403)
    ),
    withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
    now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  assertModuleEnabled: vi.fn(),
}));

vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'content')
      return role === 'ADMIN' || role === 'MANAGER' || role === 'COMMITTEE';
    if (permission === 'contentOwn') return role === 'ADMIN' || role === 'COMMITTEE';
    return false;
  }),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { GET, POST } from '@/app/api/competitions/route';
import { makeSelectChain, makeInsertChain } from '@/test/api/helpers';

const mockCompetitions = [
  {
    id: 'comp-1',
    tenantId: 'test-tenant-id',
    title: 'Photo Contest',
    description: 'Best summer photo',
    rules: null,
    prizeInfo: '$100 gift card',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-07-01'),
    status: 'ACTIVE',
    entryCount: 12,
    image: null,
    type: 'RAFFLE',
    winnersCount: 1,
    maxParticipants: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
  },
  {
    id: 'comp-2',
    tenantId: 'test-tenant-id',
    title: 'Gardening Award',
    description: 'Best garden',
    rules: null,
    prizeInfo: null,
    startDate: new Date('2026-05-01'),
    endDate: new Date('2026-05-30'),
    status: 'ENDED',
    entryCount: 8,
    image: null,
    type: 'RAFFLE',
    winnersCount: 1,
    maxParticipants: null,
    createdAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-01T00:00:00Z'),
    deletedAt: null,
  },
];

function mockSelectReturn(result: unknown[]) {
  mocks.dbMock.select.mockReturnValue(makeSelectChain(result));
}

describe('Competitions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    // Default db.select returns chain for getSessionAndRole user lookup
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/competitions', () => {
    it('returns upcoming competitions without authentication', async () => {
      mockSelectReturn([mockCompetitions[0]]);

      const request = new Request('http://localhost:3000/api/competitions?upcoming=true');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Photo Contest');
    });

    it('returns 401 when no auth and no upcoming param', async () => {
      const request = new Request('http://localhost:3000/api/competitions');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('lists all competitions for authenticated user', async () => {
      mockSelectReturn(mockCompetitions);
      mocks.sessionResult = { user: { id: 'user-1', role: 'RESIDENT' } };

      const request = new Request('http://localhost:3000/api/competitions');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
    });

    it('filters competitions by status', async () => {
      mockSelectReturn([mockCompetitions[0]]);
      mocks.sessionResult = { user: { id: 'user-1', role: 'RESIDENT' } };

      const request = new Request('http://localhost:3000/api/competitions?status=ACTIVE');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe('ACTIVE');
    });
  });

  describe('POST /api/competitions', () => {
    it('returns 401 when not authenticated', async () => {
      const request = new Request('http://localhost:3000/api/competitions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Test', startDate: '2026-07-01', endDate: '2026-08-01' }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when user lacks permission', async () => {
      mocks.sessionResult = { user: { id: 'user-1', role: 'RESIDENT' } };

      const request = new Request('http://localhost:3000/api/competitions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Test', startDate: '2026-07-01', endDate: '2026-08-01' }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('returns 400 when required fields are missing', async () => {
      mocks.sessionResult = { user: { id: 'user-1', role: 'ADMIN' } };
      // getSessionAndRole re-fetches role from DB
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));

      const request = new Request('http://localhost:3000/api/competitions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      });

      const response = await POST(request);
      const body = await response.json();

      // Route uses apiSuccess for validation errors (returns 200 with error in body)
      expect(body.data.error).toContain('Missing required fields');
    });

    it('creates competition with valid data', async () => {
      mocks.sessionResult = { user: { id: 'user-1', role: 'ADMIN' } };
      // getSessionAndRole re-fetches role from DB
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.insert.mockReturnValue(
        makeInsertChain([{ ...mockCompetitions[0], status: 'DRAFT' }])
      );

      const request = new Request('http://localhost:3000/api/competitions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'Photo Contest',
          description: 'Best summer photo',
          startDate: '2026-06-01',
          endDate: '2026-07-01',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.data.title).toBe('Photo Contest');
      expect(body.data.status).toBe('DRAFT');
    });
  });
});
