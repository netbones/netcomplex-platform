/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeInsertChain } from '@/test/api/helpers';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({}));

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  dbSelect: vi.fn(),
  dbInsert: vi.fn(),
  logError: vi.fn(),
  nowFn: vi.fn(() => new Date('2026-06-21T00:00:00.000Z')),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: { api: { getSession: (...args: any[]) => mocks.getSession(...args) } },
    db: {
      select: (...args: any[]) => mocks.dbSelect(...args),
      insert: (...args: any[]) => mocks.dbInsert(...args),
    },
    users: { id: 'id', isPlatformAdmin: 'isPlatformAdmin' },
    tenants: { id: 'id' },
    assistSessions: {
      id: 'id',
      tenantId: 'tenantId',
      staffId: 'staffId',
      scope: 'scope',
      expiresAt: 'expiresAt',
      isActive: 'isActive',
      createdAt: 'createdAt',
      notes: 'notes',
    },
    now: () => mocks.nowFn(),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiCreated: (data: unknown, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status: 201, ...(init || {}) }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message } },
        { status: 403 }
      ) as any,
    apiError: (code: string, message: string, status: number) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
    apiNotFound: (message = 'Not found') =>
      NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message } },
        { status: 404 }
      ) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
  };
});

vi.mock('@shared/lib', () => ({
  logError: (...args: any[]) => mocks.logError(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { GET, POST } from '@/app/api/admin/platform/assist/route';

const SESSION_FIXTURES = [
  {
    id: 'session-1',
    tenantId: 'tenant-1',
    staffId: 'admin-1',
    scope: 'metadata',
    expiresAt: '2026-07-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-06-21T00:00:00.000Z',
    notes: null,
  },
  {
    id: 'session-2',
    tenantId: 'tenant-2',
    staffId: 'admin-1',
    scope: 'metadata',
    expiresAt: '2026-07-05T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-06-21T00:00:00.000Z',
    notes: 'Setup assistance',
  },
];

const NEW_SESSION_FIXTURE = {
  id: 'new-session-1',
  tenantId: 'tenant-1',
  staffId: 'admin-1',
  scope: 'metadata',
  expiresAt: '2026-07-28T00:00:00.000Z',
};

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options ?? {}) as any;
}

describe('Admin Platform Assist API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mocks.dbSelect.mockReturnValue(makeSelectChain([]));
    mocks.dbInsert.mockReturnValue(makeInsertChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/platform/assist', () => {
    it('returns 401 without session', async () => {
      mocks.getSession.mockResolvedValueOnce(null);

      const res = await GET(makeRequest('http://localhost/api/admin/platform/assist'));

      expect(res.status).toBe(401);
      expect(mocks.dbSelect).not.toHaveBeenCalled();
    });

    it('returns 403 for non-platform-admin', async () => {
      mocks.dbSelect.mockReturnValue(makeSelectChain([{ isPlatformAdmin: false }]));

      const res = await GET(makeRequest('http://localhost/api/admin/platform/assist'));

      expect(res.status).toBe(403);
    });

    it('returns list of assist sessions on success', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain(SESSION_FIXTURES);
      });

      const res = await GET(makeRequest('http://localhost/api/admin/platform/assist'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).success).toBe(true);
      expect((body as any).data).toEqual(SESSION_FIXTURES);
    });

    it('filters sessions by tenantId', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([SESSION_FIXTURES[0]]);
      });

      const res = await GET(
        makeRequest('http://localhost/api/admin/platform/assist?tenantId=tenant-1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toHaveLength(1);
      expect((body as any).data[0].tenantId).toBe('tenant-1');
    });

    it('returns 500 when db throws', async () => {
      mocks.getSession.mockResolvedValue({ user: { id: 'admin-1' } });

      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        throw new Error('DB error');
      });

      const res = await GET(makeRequest('http://localhost/api/admin/platform/assist'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
      expect(mocks.logError).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'assist-api', operation: 'LIST' }),
        'Failed to list assist sessions',
        expect.any(Error)
      );
    });
  });

  describe('POST /api/admin/platform/assist', () => {
    it('returns 401 without session', async () => {
      mocks.getSession.mockResolvedValueOnce(null);

      const res = await POST(
        makeRequest('http://localhost/api/admin/platform/assist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId: 'tenant-1' }),
        })
      );

      expect(res.status).toBe(401);
    });

    it('returns 403 for non-platform-admin', async () => {
      mocks.dbSelect.mockReturnValue(makeSelectChain([{ isPlatformAdmin: false }]));

      const res = await POST(
        makeRequest('http://localhost/api/admin/platform/assist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId: 'tenant-1' }),
        })
      );

      expect(res.status).toBe(403);
    });

    it('returns 400 when tenantId is missing', async () => {
      mocks.dbSelect.mockReturnValue(makeSelectChain([{ isPlatformAdmin: true }]));

      const res = await POST(
        makeRequest('http://localhost/api/admin/platform/assist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
      expect((body as any).error.message).toBe('tenantId is required');
    });

    it('returns 404 when tenant not found', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([]);
      });

      const res = await POST(
        makeRequest('http://localhost/api/admin/platform/assist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId: 'nonexistent' }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect((body as any).error.code).toBe('NOT_FOUND');
    });

    it('creates assist session with default 7-day expiry', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([{ id: 'tenant-1' }]);
      });
      mocks.dbInsert.mockReturnValue(makeInsertChain([NEW_SESSION_FIXTURE]));

      const res = await POST(
        makeRequest('http://localhost/api/admin/platform/assist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId: 'tenant-1' }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect((body as any).success).toBe(true);
      expect((body as any).data).toEqual(NEW_SESSION_FIXTURE);
    });

    it('creates assist session with custom expiresAt', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([{ id: 'tenant-1' }]);
      });
      mocks.dbInsert.mockReturnValue(makeInsertChain([NEW_SESSION_FIXTURE]));

      const res = await POST(
        makeRequest('http://localhost/api/admin/platform/assist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId: 'tenant-1', expiresAt: '2026-07-28T00:00:00.000Z' }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect((body as any).data).toEqual(NEW_SESSION_FIXTURE);
    });

    it('returns 500 when insert throws', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([{ id: 'tenant-1' }]);
      });
      mocks.dbInsert.mockImplementation(() => {
        throw new Error('Insert failed');
      });

      const res = await POST(
        makeRequest('http://localhost/api/admin/platform/assist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId: 'tenant-1' }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
      expect(mocks.logError).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'assist-api', operation: 'CREATE' }),
        'Failed to create assist session',
        expect.any(Error)
      );
    });
  });
});
