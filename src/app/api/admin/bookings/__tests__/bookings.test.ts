import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  sessionRole: null as { userId: string; role: string } | null,
  isAdminValue: true,
  facilities: [] as unknown[],
  dbSelectChain: {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
  dbUpdateChain: {
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
  dbInsertChain: {
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  },
  withTenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test' },
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.withTenantResult),
}));

vi.mock('@entities/booking/server', () => ({
  getTenantFacilities: vi.fn(() => Promise.resolve(mocks.facilities)),
}));

vi.mock('@entities/booking', () => ({}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getSessionAndRole: () => Promise.resolve(mocks.sessionRole),
    db: {
      select: vi.fn(() => mocks.dbSelectChain),
      update: vi.fn(() => mocks.dbUpdateChain),
      insert: vi.fn(() => mocks.dbInsertChain),
    },
    notDeleted: vi.fn(() => true),
    guardSuspension: vi.fn(() => null),
    auth: { api: { getSession: vi.fn(() => Promise.resolve(null)) } },
    revalidateDashboard: vi.fn(),
    CACHE_TAGS: {},
    settings: {},
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json(
        { success: true, data },
        { status, ...(init || {}) }
      ) as unknown as Response,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message } },
        { status: 403 }
      ) as unknown as Response,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as unknown as Response,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as unknown as Response,
  };
});

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    isAdmin: (role: string) => role === 'ADMIN',
    hasPermission: (role: string, ..._args: unknown[]) => role === 'ADMIN',
  };
});

import { GET, PUT } from '@/app/api/admin/bookings/route';

describe('GET /api/admin/bookings', () => {
  beforeEach(() => {
    mocks.sessionRole = null;
    mocks.facilities = [];
    mocks.withTenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without session', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    mocks.sessionRole = { userId: 'u1', role: 'RESIDENT' };
    mocks.isAdminValue = false;
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns facilities for admin', async () => {
    mocks.sessionRole = { userId: 'u1', role: 'ADMIN' };
    mocks.facilities = [
      { value: 'pool', label: 'Pool' },
      { value: 'gym', label: 'Gym' },
    ];
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it('handles error gracefully', async () => {
    const mod = await import('@entities/booking/server');
    (mod.getTenantFacilities as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('fail'));
    mocks.sessionRole = { userId: 'u1', role: 'ADMIN' };
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/admin/bookings', () => {
  beforeEach(() => {
    mocks.sessionRole = null;
    mocks.dbSelectChain = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    };
    mocks.dbUpdateChain = {
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    };
  });

  it('returns 401 without session', async () => {
    const res = await PUT(
      new NextRequest('http://localhost:3000', {
        method: 'PUT',
        body: JSON.stringify([]),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    mocks.sessionRole = { userId: 'u1', role: 'RESIDENT' };
    const res = await PUT(
      new NextRequest('http://localhost:3000', {
        method: 'PUT',
        body: JSON.stringify([]),
      })
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 for non-array body', async () => {
    mocks.sessionRole = { userId: 'u1', role: 'ADMIN' };
    const res = await PUT(
      new NextRequest('http://localhost:3000', {
        method: 'PUT',
        body: JSON.stringify('not-an-array'),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for facility missing value', async () => {
    mocks.sessionRole = { userId: 'u1', role: 'ADMIN' };
    const res = await PUT(
      new NextRequest('http://localhost:3000', {
        method: 'PUT',
        body: JSON.stringify([{ label: 'Pool' }]),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for facility missing label', async () => {
    mocks.sessionRole = { userId: 'u1', role: 'ADMIN' };
    const res = await PUT(
      new NextRequest('http://localhost:3000', {
        method: 'PUT',
        body: JSON.stringify([{ value: 'pool' }]),
      })
    );
    expect(res.status).toBe(400);
  });

  it('inserts new facilities when none exist', async () => {
    mocks.sessionRole = { userId: 'u1', role: 'ADMIN' };
    mocks.dbSelectChain = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    };
    mocks.dbInsertChain = {
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'new-id' }])),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const res = await PUT(
      new NextRequest('http://localhost:3000', {
        method: 'PUT',
        body: JSON.stringify([{ value: 'pool', label: 'Pool' }]),
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.success).toBe(true);
    expect(mocks.dbInsertChain.values).toHaveBeenCalled();
  });

  it('updates existing facilities', async () => {
    mocks.sessionRole = { userId: 'u1', role: 'ADMIN' };
    mocks.dbSelectChain = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ id: 'existing-id' }])),
        })),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    mocks.dbUpdateChain = {
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    };

    const res = await PUT(
      new NextRequest('http://localhost:3000', {
        method: 'PUT',
        body: JSON.stringify([{ value: 'pool', label: 'Pool' }]),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.dbUpdateChain.set).toHaveBeenCalled();
  });

  it('handles error gracefully', async () => {
    mocks.sessionRole = { userId: 'u1', role: 'ADMIN' };
    mocks.dbSelectChain = {
      from: vi.fn(() => {
        throw new Error('DB fail');
      }),
    };
    const res = await PUT(
      new NextRequest('http://localhost:3000', {
        method: 'PUT',
        body: JSON.stringify([{ value: 'pool', label: 'Pool' }]),
      })
    );
    expect(res.status).toBe(500);
  });
});
