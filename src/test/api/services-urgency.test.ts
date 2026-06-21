import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => null),
    })
  ),
}));

const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      })),
    })),
  },
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  const mod = await vi.importActual<typeof import('@api/server')>('@api/server');
  return {
    auth: {
      api: {
        getSession: () => Promise.resolve(mocks.sessionResult),
      },
    },
    db: mocks.dbMock,
    maintenanceRequests: mod.maintenanceRequests,
    bookings: mod.bookings,
    now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json(
        { success: true, data },
        { status, ...(init || {}) }
      ) as unknown as Response,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as unknown as Response,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as unknown as Response,
  };
});

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  };
});

import { GET } from '@/app/api/services/urgency/route';

describe('GET /api/services/urgency', () => {
  beforeEach(() => {
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.dbMock.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      })),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without a session', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns urgency counts for authenticated user', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.commandBar.openMaintenance).toBe(0);
    expect(body.data.commandBar.upcomingBookings).toBe(0);
    expect(body.data.domainBadges.maintenance).toBe(0);
    expect(body.data.domainBadges.bookings).toBe(0);
  });

  it('returns non-zero counts from database', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    let callCount = 0;
    mocks.dbMock.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve([{ count: 3 }]);
          if (callCount === 2) return Promise.resolve([{ count: 5 }]);
          return Promise.resolve([{ count: 1 }]);
        }),
      })),
    }));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.commandBar.openMaintenance).toBe(3);
    expect(body.data.commandBar.upcomingBookings).toBe(5);
    expect(body.data.domainBadges.maintenance).toBe(3);
    expect(body.data.domainBadges.bookings).toBe(5);
  });

  it('handles database error gracefully', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select = vi.fn(() => {
      throw new Error('DB failure');
    });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
