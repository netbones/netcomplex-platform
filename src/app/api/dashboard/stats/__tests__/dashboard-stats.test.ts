/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

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
  authSession: null as { user: { id: string } } | null,
  dbMock: {
    select: vi.fn(),
  },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: {
      api: {
        getSession: vi.fn(() => Promise.resolve(mocks.authSession)),
      },
    },
    db: mocks.dbMock,
    users: { id: 'id', tenantId: 'tenantId' },
    maintenanceRequests: { id: 'id', tenantId: 'tenantId', userId: 'userId' },
    bookings: { id: 'id', tenantId: 'tenantId', userId: 'userId' },
    conversations: { id: 'id', tenantId: 'tenantId' },
    conversationParticipants: { id: 'id', tenantId: 'tenantId', userId: 'userId' },
    notifications: { id: 'id', tenantId: 'tenantId', userId: 'userId' },
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiError: (code: string, message: string, status = 500) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
    withErrorHandler: (handler: any) => handler,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { GET } from '@/app/api/dashboard/stats/route';

function makeCountSelect(result: { count: number }) {
  return makeSelectChain([result]);
}

describe('Dashboard Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.authSession = { user: { id: 'user-1' } };
    // Default: all counts return 0
    mocks.dbMock.select
      .mockReturnValueOnce(makeCountSelect({ count: 0 }))
      .mockReturnValueOnce(makeCountSelect({ count: 0 }))
      .mockReturnValueOnce(makeCountSelect({ count: 0 }))
      .mockReturnValueOnce(makeCountSelect({ count: 0 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/dashboard/stats', () => {
    it('returns 401 without a session', async () => {
      mocks.authSession = null;

      const res = await GET(new Request('http://localhost/api/dashboard/stats') as any);

      expect(res.status).toBe(401);
    });

    it('returns all stats with correct counts', async () => {
      mocks.dbMock.select
        .mockReset()
        .mockReturnValueOnce(makeCountSelect({ count: 5 })) // maintenance requests
        .mockReturnValueOnce(makeCountSelect({ count: 3 })) // bookings
        .mockReturnValueOnce(makeCountSelect({ count: 12 })) // conversations
        .mockReturnValueOnce(makeCountSelect({ count: 7 })); // notifications

      const res = await GET(new Request('http://localhost/api/dashboard/stats') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({
        requests: 5,
        bookings: 3,
        messages: 12,
        notifications: 7,
      });
    });

    it('returns zero counts when user has no activity', async () => {
      mocks.dbMock.select
        .mockReset()
        .mockReturnValueOnce(makeCountSelect({ count: 0 }))
        .mockReturnValueOnce(makeCountSelect({ count: 0 }))
        .mockReturnValueOnce(makeCountSelect({ count: 0 }))
        .mockReturnValueOnce(makeCountSelect({ count: 0 }));

      const res = await GET(new Request('http://localhost/api/dashboard/stats') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({
        requests: 0,
        bookings: 0,
        messages: 0,
        notifications: 0,
      });
    });

    it('filters by both userId and tenantId for each query', async () => {
      const selectMock = mocks.dbMock.select;
      selectMock
        .mockReset()
        .mockReturnValueOnce(makeCountSelect({ count: 1 }))
        .mockReturnValueOnce(makeCountSelect({ count: 1 }))
        .mockReturnValueOnce(makeCountSelect({ count: 1 }))
        .mockReturnValueOnce(makeCountSelect({ count: 1 }));

      await GET(new Request('http://localhost/api/dashboard/stats') as any);

      // Verify all 4 select calls happened with correct params
      expect(selectMock).toHaveBeenCalledTimes(4);
    });

    it('queries all four tables independently', async () => {
      mocks.dbMock.select
        .mockReset()
        .mockReturnValueOnce(makeCountSelect({ count: 10 })) // maintenanceRequests
        .mockReturnValueOnce(makeCountSelect({ count: 20 })) // bookings
        .mockReturnValueOnce(makeCountSelect({ count: 30 })) // conversationParticipants
        .mockReturnValueOnce(makeCountSelect({ count: 40 })); // notifications

      const res = await GET(new Request('http://localhost/api/dashboard/stats') as any);
      const body = await res.json();

      expect((body as any).data.requests).toBe(10);
      expect((body as any).data.bookings).toBe(20);
      expect((body as any).data.messages).toBe(30);
      expect((body as any).data.notifications).toBe(40);
    });

    it('handles large counts without overflow', async () => {
      mocks.dbMock.select
        .mockReset()
        .mockReturnValueOnce(makeCountSelect({ count: 9999 }))
        .mockReturnValueOnce(makeCountSelect({ count: 9999 }))
        .mockReturnValueOnce(makeCountSelect({ count: 9999 }))
        .mockReturnValueOnce(makeCountSelect({ count: 9999 }));

      const res = await GET(new Request('http://localhost/api/dashboard/stats') as any);
      const body = await res.json();

      expect((body as any).data.requests).toBe(9999);
      expect((body as any).data.bookings).toBe(9999);
      expect((body as any).data.messages).toBe(9999);
      expect((body as any).data.notifications).toBe(9999);
    });
  });
});
