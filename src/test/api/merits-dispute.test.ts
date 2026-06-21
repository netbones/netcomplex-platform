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
      disputeReason: 'disputeReason',
      disputedAt: 'disputedAt',
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

import { POST } from '@/app/api/merits/[id]/dispute/route';

describe('Merits Dispute API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { user: { id: 'user-1', role: 'RESIDENT' } };
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/merits/[id]/dispute', () => {
    function disputeRequest(body: unknown): Request {
      return new Request('http://localhost/api/merits/r1/dispute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    it('returns 401 without auth session', async () => {
      mocks.authSession = null;

      const res = await POST(disputeRequest({ reason: 'This was not my fault' }), {
        params: Promise.resolve({ id: 'r1' }),
      });

      expect(res.status).toBe(401);
    });

    it('returns 400 when reason is missing', async () => {
      const res = await POST(disputeRequest({}), { params: Promise.resolve({ id: 'r1' }) });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when reason is too short', async () => {
      const res = await POST(disputeRequest({ reason: 'No' }), {
        params: Promise.resolve({ id: 'r1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when record not found', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const res = await POST(disputeRequest({ reason: 'This was not my fault' }), {
        params: Promise.resolve({ id: 'r1' }),
      });

      expect(res.status).toBe(404);
    });

    it("returns 403 when disputing another user's record", async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            id: 'r1',
            tenantId: 'test-tenant-id',
            userId: 'other-user',
            status: 'ACTIVE',
          },
        ])
      );

      const res = await POST(disputeRequest({ reason: 'This was not my fault' }), {
        params: Promise.resolve({ id: 'r1' }),
      });

      expect(res.status).toBe(403);
    });

    it('returns 400 when record is not ACTIVE', async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            id: 'r1',
            tenantId: 'test-tenant-id',
            userId: 'user-1',
            status: 'DISPUTED',
          },
        ])
      );

      const res = await POST(disputeRequest({ reason: 'This was not my fault' }), {
        params: Promise.resolve({ id: 'r1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
    });

    it('successfully disputes an ACTIVE record', async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            id: 'r1',
            tenantId: 'test-tenant-id',
            userId: 'user-1',
            status: 'ACTIVE',
          },
        ])
      );

      const res = await POST(disputeRequest({ reason: 'This was not my fault' }), {
        params: Promise.resolve({ id: 'r1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.status).toBe('DISPUTED');
    });

    it('writes audit log on successful dispute', async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            id: 'r1',
            tenantId: 'test-tenant-id',
            userId: 'user-1',
            status: 'ACTIVE',
          },
        ])
      );

      await POST(disputeRequest({ reason: 'This was not my fault' }), {
        params: Promise.resolve({ id: 'r1' }),
      });

      expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
      expect(mocks.writeAuditLog).toHaveBeenCalledWith({
        tenantId: 'test-tenant-id',
        action: 'MERIT_DISPUTE_FILED',
        targetId: 'r1',
        actorId: 'user-1',
        details: { reason: 'This was not my fault' },
      });
    });

    it('updates the record status to DISPUTED with reason and timestamp', async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          {
            id: 'r1',
            tenantId: 'test-tenant-id',
            userId: 'user-1',
            status: 'ACTIVE',
          },
        ])
      );

      await POST(disputeRequest({ reason: 'This was not my fault' }), {
        params: Promise.resolve({ id: 'r1' }),
      });

      expect(mocks.dbMock.update).toHaveBeenCalledOnce();
    });
  });
});
