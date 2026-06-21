/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from './helpers';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({}));

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  dbSelect: vi.fn(),
  dbUpdate: vi.fn(),
  logError: vi.fn(),
  nowFn: vi.fn(() => new Date('2026-06-21T00:00:00.000Z')),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: { api: { getSession: (...args: any[]) => mocks.getSession(...args) } },
    db: {
      select: (...args: any[]) => mocks.dbSelect(...args),
      update: (...args: any[]) => mocks.dbUpdate(...args),
    },
    users: { id: 'id', isPlatformAdmin: 'isPlatformAdmin' },
    tenants: { id: 'id', ownerId: 'ownerId' },
    assistSessions: {
      id: 'id',
      tenantId: 'tenantId',
      staffId: 'staffId',
      scope: 'scope',
      expiresAt: 'expiresAt',
      isActive: 'isActive',
      createdAt: 'createdAt',
      revokedAt: 'revokedAt',
      revokedBy: 'revokedBy',
      notes: 'notes',
    },
    now: () => mocks.nowFn(),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiError: (code: string, message: string, status: number) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
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
}));

import { DELETE, PATCH } from '@/app/api/admin/platform/assist/[id]/route';

const ASSIST_SESSION_FIXTURE = {
  id: 'session-1',
  tenantId: 'tenant-1',
  staffId: 'staff-1',
  scope: 'metadata',
  expiresAt: new Date('2026-07-01T00:00:00.000Z'),
  isActive: true,
  createdAt: new Date('2026-06-21T00:00:00.000Z'),
  revokedAt: null,
  revokedBy: null,
  notes: null,
};

const makeUpdateChainForDelete = () => ({
  set: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve(undefined)),
  })),
});

const makeUpdateChainForPatch = (result: unknown[]) => ({
  set: vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve(result)),
    })),
  })),
});

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options ?? {}) as any;
}

const UPDATED_SESSION_FIXTURE = {
  id: 'session-1',
  expiresAt: '2026-08-01T00:00:00.000Z',
};

describe('Admin Platform Assist [id] API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mocks.dbSelect.mockReturnValue(makeSelectChain([]));
    mocks.dbUpdate.mockReturnValue(makeUpdateChainForDelete());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('DELETE /api/admin/platform/assist/[id]', () => {
    it('returns 401 without session', async () => {
      mocks.getSession.mockResolvedValueOnce(null);

      const res = await DELETE(
        makeRequest('http://localhost/api/admin/platform/assist/session-1'),
        makeParams('session-1')
      );

      expect(res.status).toBe(401);
    });

    it('returns 404 when assist session not found', async () => {
      mocks.dbSelect.mockReturnValue(makeSelectChain([]));

      const res = await DELETE(
        makeRequest('http://localhost/api/admin/platform/assist/session-1'),
        makeParams('session-1')
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect((body as any).error.code).toBe('NOT_FOUND');
    });

    it('returns 400 when assist session already revoked', async () => {
      mocks.dbSelect.mockReturnValue(
        makeSelectChain([{ ...ASSIST_SESSION_FIXTURE, isActive: false }])
      );

      const res = await DELETE(
        makeRequest('http://localhost/api/admin/platform/assist/session-1'),
        makeParams('session-1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
      expect((body as any).error.message).toContain('already revoked');
    });

    it('returns 403 when user is not platform admin nor tenant owner', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([ASSIST_SESSION_FIXTURE]);
        if (callCount === 2) return makeSelectChain([{ isPlatformAdmin: false }]);
        return makeSelectChain([{ ownerId: 'other-user' }]);
      });

      const res = await DELETE(
        makeRequest('http://localhost/api/admin/platform/assist/session-1'),
        makeParams('session-1')
      );

      expect(res.status).toBe(403);
    });

    it('platform admin can revoke assist session', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([ASSIST_SESSION_FIXTURE]);
        if (callCount === 2) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([{ ownerId: 'other-user' }]);
      });
      mocks.dbUpdate.mockReturnValue(makeUpdateChainForDelete());

      const res = await DELETE(
        makeRequest('http://localhost/api/admin/platform/assist/session-1'),
        makeParams('session-1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).success).toBe(true);
      expect((body as any).data).toEqual({ success: true });
    });

    it('tenant owner can revoke assist session', async () => {
      mocks.getSession.mockResolvedValue({ user: { id: 'tenant-owner' } });

      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([ASSIST_SESSION_FIXTURE]);
        if (callCount === 2) return makeSelectChain([{ isPlatformAdmin: false }]);
        return makeSelectChain([{ ownerId: 'tenant-owner' }]);
      });
      mocks.dbUpdate.mockReturnValue(makeUpdateChainForDelete());

      const res = await DELETE(
        makeRequest('http://localhost/api/admin/platform/assist/session-1'),
        makeParams('session-1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({ success: true });
    });

    it('returns 500 on error', async () => {
      mocks.dbSelect.mockImplementation(() => {
        throw new Error('DB error');
      });

      const res = await DELETE(
        makeRequest('http://localhost/api/admin/platform/assist/session-1'),
        makeParams('session-1')
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
      expect(mocks.logError).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'assist-api', operation: 'REVOKE' }),
        'Failed to revoke assist session',
        expect.any(Error)
      );
    });
  });

  describe('PATCH /api/admin/platform/assist/[id]', () => {
    it('returns 401 without session', async () => {
      mocks.getSession.mockResolvedValueOnce(null);

      const res = await PATCH(
        makeRequest('http://localhost/api/admin/platform/assist/session-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ expiresAt: '2026-08-01T00:00:00.000Z' }),
        }),
        makeParams('session-1')
      );

      expect(res.status).toBe(401);
    });

    it('returns 403 for non-platform-admin', async () => {
      mocks.dbSelect.mockReturnValue(makeSelectChain([{ isPlatformAdmin: false }]));

      const res = await PATCH(
        makeRequest('http://localhost/api/admin/platform/assist/session-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ expiresAt: '2026-08-01T00:00:00.000Z' }),
        }),
        makeParams('session-1')
      );

      expect(res.status).toBe(403);
    });

    it('returns 404 when assist session not found', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([]);
      });

      const res = await PATCH(
        makeRequest('http://localhost/api/admin/platform/assist/session-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ expiresAt: '2026-08-01T00:00:00.000Z' }),
        }),
        makeParams('session-1')
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect((body as any).error.code).toBe('NOT_FOUND');
    });

    it('returns 400 when expiresAt is missing', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([ASSIST_SESSION_FIXTURE]);
      });

      const res = await PATCH(
        makeRequest('http://localhost/api/admin/platform/assist/session-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        makeParams('session-1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
      expect((body as any).error.message).toBe('expiresAt is required');
    });

    it('extends assist session successfully', async () => {
      let callCount = 0;
      mocks.dbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([ASSIST_SESSION_FIXTURE]);
      });
      mocks.dbUpdate.mockReturnValue(makeUpdateChainForPatch([UPDATED_SESSION_FIXTURE]));

      const res = await PATCH(
        makeRequest('http://localhost/api/admin/platform/assist/session-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ expiresAt: '2026-08-01T00:00:00.000Z' }),
        }),
        makeParams('session-1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).success).toBe(true);
      expect((body as any).data).toEqual(UPDATED_SESSION_FIXTURE);
    });

    it('returns 500 on error', async () => {
      mocks.dbSelect.mockImplementation(() => {
        throw new Error('DB error');
      });

      const res = await PATCH(
        makeRequest('http://localhost/api/admin/platform/assist/session-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ expiresAt: '2026-08-01T00:00:00.000Z' }),
        }),
        makeParams('session-1')
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
      expect(mocks.logError).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'assist-api', operation: 'EXTEND' }),
        'Failed to extend assist session',
        expect.any(Error)
      );
    });
  });
});
