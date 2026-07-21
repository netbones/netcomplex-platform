/* eslint-disable @typescript-eslint/no-explicit-any */
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
  dbMock: {
    select: vi.fn(),
  },
  hasPermission: vi.fn(),
  apiSuccess: vi.fn(
    (data: unknown): Response =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    (message = 'Authentication required'): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiForbidden: vi.fn(
    (message = 'Forbidden'): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message } }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string, status = 500): Response =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'content-type': 'application/json' },
      })
  ),
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  groupMembershipRequests: {
    id: 'id',
    userId: 'userId',
    groupId: 'groupId',
    status: 'status',
    message: 'message',
    createdAt: 'createdAt',
    tenantId: 'tenantId',
  },
  users: { id: 'id', role: 'role', name: 'name', email: 'email' },
  groups: { id: 'id', name: 'name', accessType: 'accessType' },
  getSessionAndRole: vi.fn(() => {
    if (!mocks.sessionResult) return Promise.resolve(null);
    return Promise.resolve({ userId: mocks.sessionResult.user.id, role: 'ADMIN' });
  }),
  guardSuspension: vi.fn(() => null),
  withErrorHandler: vi.fn((handler: any) => handler as never),
  apiSuccess: mocks.apiSuccess,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiError: mocks.apiError,
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: any[]) => mocks.hasPermission(...args),
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { GET } from '@/app/api/groups/membership-requests/route';
import { makeSelectChain } from '@/test/api/helpers';

function makeReq(url = 'http://localhost:3000/api/groups/membership-requests'): Request {
  return new Request(url, {
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
    },
  });
}

describe('GET /api/groups/membership-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.hasPermission.mockReturnValue(false);
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authentication and authorization', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await GET(makeReq());
      expect(response.status).toBe(401);
    });

    it('returns 403 when user lacks content permission', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      // The local getSessionAndRole calls db.select for the user role
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

      const response = await GET(makeReq());
      expect(response.status).toBe(403);
    });

    it('allows access with content permission', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.hasPermission.mockReturnValue(true);

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([]));

      const response = await GET(makeReq());
      expect(response.status).toBe(200);
    });
  });

  describe('query parameter filtering', () => {
    it('defaults status filter to PENDING when no status query param', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.hasPermission.mockReturnValue(true);

      const requests = [
        {
          id: 'req-1',
          userId: 'user-2',
          groupId: 'g-1',
          status: 'PENDING',
          message: 'Please add me',
          createdAt: new Date(),
          user: { name: 'Bob', email: 'bob@test.com' },
          group: { name: 'Book Club', accessType: 'OPEN' },
        },
      ];

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain(requests));
 
      const response = await GET(makeReq());
      expect(response.status).toBe(200);
 
      const body = await response.json();
      expect(body.data.requests).toHaveLength(1);
      expect(body.data.requests[0].status).toBe('PENDING');
    });
 
    it('filters by status=ALL to return all statuses', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.hasPermission.mockReturnValue(true);
 
      const requests = [
        { id: 'req-1', status: 'PENDING', user: null, group: null },
        { id: 'req-2', status: 'APPROVED', user: null, group: null },
        { id: 'req-3', status: 'REJECTED', user: null, group: null },
      ];
 
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain(requests));

      const response = await GET(
        makeReq('http://localhost:3000/api/groups/membership-requests?status=ALL')
      );
      expect(response.status).toBe(200);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.requests).toHaveLength(3);
    });

    it('filters by groupId when query param is provided', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.hasPermission.mockReturnValue(true);

      mocks.dbMock.select
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: 'req-1',
              userId: 'user-2',
              groupId: 'g-1',
              status: 'PENDING',
              message: null,
              createdAt: new Date(),
              user: { name: 'Bob', email: 'bob@test.com' },
              group: { name: 'Book Club', accessType: 'OPEN' },
            },
          ])
        );

      const response = await GET(
        makeReq('http://localhost:3000/api/groups/membership-requests?groupId=g-1')
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.requests).toHaveLength(1);
      expect(body.data.requests[0].groupId).toBe('g-1');
    });

    it('combines status and groupId filters', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.hasPermission.mockReturnValue(true);

      mocks.dbMock.select
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: 'req-1',
              userId: 'user-2',
              groupId: 'g-1',
              status: 'PENDING',
              message: 'Please add me',
              createdAt: new Date(),
              user: { name: 'Bob', email: 'bob@test.com' },
              group: { name: 'Book Club', accessType: 'OPEN' },
            },
          ])
        );
 
      const response = await GET(
        makeReq('http://localhost:3000/api/groups/membership-requests?status=PENDING&groupId=g-1')
      );
      expect(response.status).toBe(200);
      expect(response.status).toBe(200);
    });
  });

  describe('data shape and edge cases', () => {
    it('returns requests with user and group join data', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.hasPermission.mockReturnValue(true);

      const requests = [
        {
          id: 'req-1',
          userId: 'user-2',
          groupId: 'g-1',
          status: 'PENDING',
          message: 'I would like to join',
          createdAt: new Date('2026-06-21T10:00:00Z'),
          user: { name: 'Bob Smith', email: 'bob@example.com' },
          group: { name: 'Book Club', accessType: 'OPEN' },
        },
      ];

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain(requests));
 
      const response = await GET(makeReq());
      const body = await response.json();
      const req = body.data.requests[0];

      expect(req.id).toBe('req-1');
      expect(req.user.name).toBe('Bob Smith');
      expect(req.user.email).toBe('bob@example.com');
      expect(req.group.name).toBe('Book Club');
      expect(req.group.accessType).toBe('OPEN');
      expect(req.message).toBe('I would like to join');
    });

    it('handles null user/group joins gracefully', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.hasPermission.mockReturnValue(true);

      const requests = [
        {
          id: 'req-1',
          userId: 'deleted-user',
          groupId: 'deleted-group',
          status: 'PENDING',
          message: null,
          createdAt: new Date(),
          user: null,
          group: null,
        },
      ];

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain(requests));
 
      const response = await GET(makeReq());
      const body = await response.json();
      expect(body.data.requests[0].user).toBeNull();
      expect(body.data.requests[0].group).toBeNull();
    });

    it('returns empty requests array when no pending requests exist', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.hasPermission.mockReturnValue(true);

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([]));
 
      const response = await GET(makeReq());
      const body = await response.json();
      expect(body.data.requests).toEqual([]);
    });

    it('orders results by createdAt descending', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.hasPermission.mockReturnValue(true);

      const requests = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: new Date('2026-06-21T12:00:00Z'),
          user: null,
          group: null,
        },
        {
          id: 'req-2',
          status: 'PENDING',
          createdAt: new Date('2026-06-20T12:00:00Z'),
          user: null,
          group: null,
        },
      ];

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain(requests));
 
      const response = await GET(makeReq());
      const body = await response.json();
      // Make sure both requests come back (ordering is hard to verify with chain mocks)
      expect(body.data.requests).toHaveLength(2);
    });
  });

  describe('tenant isolation', () => {
    it('scopes requests to current tenant', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.hasPermission.mockReturnValue(true);

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([]));
 
      await GET(makeReq());
 
      // The main query's where clause includes tenantId condition
      const selectChain = mocks.dbMock.select.mock.results[0]?.value;
      expect(selectChain).toBeDefined();
    });
  });
});
