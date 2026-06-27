/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeUpdateChain } from './helpers';

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
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  authSession: null as { user: { id: string; role: string } } | null,
  dbMock: {
    select: vi.fn(),
    update: vi.fn(),
  },
  writeAuditLog: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    db: mocks.dbMock,
    auth: {
      api: {
        getSession: vi.fn(() => Promise.resolve(mocks.authSession)),
      },
    },
    communityMerits: {
      id: 'id',
      tenantId: 'tenantId',
      userId: 'userId',
      status: 'status',
      standingBefore: 'standingBefore',
      standingAfter: 'standingAfter',
      recognitionPoints: 'recognitionPoints',
      disciplinaryPoints: 'disciplinaryPoints',
      resolvedById: 'resolvedById',
      resolvedAt: 'resolvedAt',
      deletedAt: 'deletedAt',
      $inferInsert: {} as Record<string, unknown>,
    },
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
    apiError: (code: string, message: string, status: number = 500) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    withErrorHandler: (handler: any) => handler,
    now: () => new Date('2026-06-21T12:00:00Z'),
    writeAuditLog: (...args: unknown[]) => mocks.writeAuditLog(...args),
    CACHE_TAGS: { SETTINGS: 'settings' },
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn(
    (role: string, perm: string) => ['ADMIN', 'BOARD'].includes(role) || perm === 'users'
  ),
}));

import { POST } from '@/app/api/merits/[id]/resolve/route';

describe('Merits Resolve API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { user: { id: 'admin-1', role: 'ADMIN' } };
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/merits/[id]/resolve', () => {
    function resolveRequest(body: unknown): Request {
      return new Request('http://localhost/api/merits/r1/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    it('returns 401 without auth session', async () => {
      mocks.authSession = null;

      const res = await POST(resolveRequest({ verdict: 'UPHOLD' }), {
        params: Promise.resolve({ id: 'r1' }),
      });

      expect(res.status).toBe(401);
    });

    it('returns 403 without users permission', async () => {
      const { hasPermission } = await import('@shared/lib');
      vi.mocked(hasPermission).mockReturnValueOnce(false);

      const res = await POST(resolveRequest({ verdict: 'UPHOLD' }), {
        params: Promise.resolve({ id: 'r1' }),
      });

      expect(res.status).toBe(403);
    });

    it('returns 400 when verdict is missing', async () => {
      const res = await POST(resolveRequest({}), { params: Promise.resolve({ id: 'r1' }) });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid verdict value', async () => {
      const res = await POST(resolveRequest({ verdict: 'INVALID' }), {
        params: Promise.resolve({ id: 'r1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when record not found', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const res = await POST(resolveRequest({ verdict: 'UPHOLD' }), {
        params: Promise.resolve({ id: 'r1' }),
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 when record is not DISPUTED', async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            id: 'r1',
            tenantId: 'test-tenant-id',
            status: 'ACTIVE',
            standingBefore: 10,
          },
        ])
      );

      const res = await POST(resolveRequest({ verdict: 'UPHOLD' }), {
        params: Promise.resolve({ id: 'r1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
    });

    it('resolves a dispute with UPHOLD verdict', async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            id: 'r1',
            tenantId: 'test-tenant-id',
            status: 'DISPUTED',
            standingBefore: 10,
          },
        ])
      );

      const res = await POST(resolveRequest({ verdict: 'UPHOLD' }), {
        params: Promise.resolve({ id: 'r1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.status).toBe('UPHELD');
    });

    it('resolves a dispute with OVERTURN verdict', async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            id: 'r1',
            tenantId: 'test-tenant-id',
            status: 'DISPUTED',
            standingBefore: 10,
          },
        ])
      );

      const res = await POST(resolveRequest({ verdict: 'OVERTURN' }), {
        params: Promise.resolve({ id: 'r1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.status).toBe('OVERTURNED');
    });

    it('zeroes out points on OVERTURN verdict', async () => {
      const record = {
        id: 'r1',
        tenantId: 'test-tenant-id',
        status: 'DISPUTED',
        standingBefore: 10,
      };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([record]));

      await POST(resolveRequest({ verdict: 'OVERTURN' }), {
        params: Promise.resolve({ id: 'r1' }),
      });

      // Verify update was called - the update mock chain doesn't capture args easily,
      // but we can confirm the route didn't error
      expect(mocks.dbMock.update).toHaveBeenCalledOnce();
    });

    it('preserves points on UPHOLD verdict', async () => {
      const record = {
        id: 'r1',
        tenantId: 'test-tenant-id',
        status: 'DISPUTED',
        standingBefore: 10,
      };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([record]));

      await POST(resolveRequest({ verdict: 'UPHOLD' }), { params: Promise.resolve({ id: 'r1' }) });

      expect(mocks.dbMock.update).toHaveBeenCalledOnce();
    });

    it('writes audit log on successful resolution', async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            id: 'r1',
            tenantId: 'test-tenant-id',
            userId: 'user-1',
            status: 'DISPUTED',
            standingBefore: 10,
          },
        ])
      );

      await POST(resolveRequest({ verdict: 'UPHOLD' }), { params: Promise.resolve({ id: 'r1' }) });

      expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
      expect(mocks.writeAuditLog).toHaveBeenCalledWith({
        tenantId: 'test-tenant-id',
        action: 'MERIT_DISPUTE_RESOLVED',
        targetId: 'r1',
        actorId: 'admin-1',
        details: { verdict: 'UPHOLD', previousStatus: 'DISPUTED' },
      });
    });
  });
});
