/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeInsertChain } from './helpers';

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
  requireAnyPermission: vi.fn(),
  dbMock: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
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
    (_code: string, _message: string, status: number) =>
      new Response(JSON.stringify({ success: false, error: { code: _code, message: _message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    db: mocks.dbMock,
    serviceProviders: {
      id: 'id',
      tenantId: 'tenantId',
      companyName: 'companyName',
      contactName: 'contactName',
      phone: 'phone',
      email: 'email',
      trade: 'trade',
      isActive: 'isActive',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      deletedAt: 'deletedAt',
    },
    now: () => new Date('2026-06-21T12:00:00Z'),
    requireAnyPermission: (perms: string[]) => mocks.requireAnyPermission(perms),
    apiSuccess: mocks.apiSuccess,
    apiCreated: mocks.apiCreated,
    apiError: mocks.apiError,
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
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
    withErrorHandler: (handler: any) => handler,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  isAdmin: (role: string | null | undefined) => {
    if (!role) return false;
    return ['ADMIN', 'BOARD'].includes(role);
  },
}));

import { GET, POST } from '@/app/api/maintenance/providers/route';

describe('GET /api/maintenance/providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAnyPermission.mockResolvedValue(null);
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when auth fails', async () => {
    mocks.requireAnyPermission.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await GET(new Request('http://localhost/api/maintenance/providers') as any);
    expect(res.status).toBe(401);
  });

  it('returns 403 when permission check returns forbidden', async () => {
    mocks.requireAnyPermission.mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await GET(new Request('http://localhost/api/maintenance/providers') as any);
    expect(res.status).toBe(403);
  });

  it('returns list of providers when authorized', async () => {
    const providers = [
      {
        id: 'p-1',
        tenantId: 'test-tenant-id',
        companyName: 'ABC Plumbing',
        trade: 'PLUMBING',
        contactName: 'Alice',
        phone: '555-0100',
        email: 'alice@abc.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: 'p-2',
        tenantId: 'test-tenant-id',
        companyName: 'XYZ Electric',
        trade: 'ELECTRICAL',
        contactName: 'Bob',
        phone: '555-0200',
        email: 'bob@xyz.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];
    mocks.dbMock.select.mockReturnValue(makeSelectChain(providers));

    const res = await GET(new Request('http://localhost/api/maintenance/providers') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data).toHaveLength(2);
    expect((body as any).data[0].companyName).toBe('ABC Plumbing');
  });

  it('filters providers by isActive=true query param', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    await GET(new Request('http://localhost/api/maintenance/providers?isActive=true') as any);

    expect(mocks.dbMock.select).toHaveBeenCalled();
  });

  it('filters providers by isActive=false query param', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    await GET(new Request('http://localhost/api/maintenance/providers?isActive=false') as any);

    expect(mocks.dbMock.select).toHaveBeenCalled();
  });

  it('returns empty list when no providers exist', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const res = await GET(new Request('http://localhost/api/maintenance/providers') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data).toHaveLength(0);
  });
});

describe('POST /api/maintenance/providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAnyPermission.mockResolvedValue(null);
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when auth fails', async () => {
    mocks.requireAnyPermission.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await POST(
      new Request('http://localhost/api/maintenance/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: 'ABC Plumbing', trade: 'PLUMBING' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when companyName is missing', async () => {
    const res = await POST(
      new Request('http://localhost/api/maintenance/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade: 'PLUMBING' }),
      })
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when trade is missing', async () => {
    const res = await POST(
      new Request('http://localhost/api/maintenance/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: 'ABC Plumbing' }),
      })
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when both companyName and trade are missing', async () => {
    const res = await POST(
      new Request('http://localhost/api/maintenance/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
  });

  it('creates a provider successfully with required fields', async () => {
    const created = {
      id: 'p-new',
      tenantId: 'test-tenant-id',
      companyName: 'ABC Plumbing',
      trade: 'PLUMBING',
      contactName: null,
      phone: null,
      email: null,
      isActive: true,
      createdAt: new Date('2026-06-21T12:00:00Z'),
      updatedAt: new Date('2026-06-21T12:00:00Z'),
    };
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([created]));

    const res = await POST(
      new Request('http://localhost/api/maintenance/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: 'ABC Plumbing', trade: 'PLUMBING' }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect((body as any).data.companyName).toBe('ABC Plumbing');
    expect((body as any).data.trade).toBe('PLUMBING');
    expect((body as any).data.isActive).toBe(true);
  });

  it('creates a provider with optional fields', async () => {
    const created = {
      id: 'p-new',
      tenantId: 'test-tenant-id',
      companyName: 'ABC Plumbing',
      trade: 'PLUMBING',
      contactName: 'Alice Smith',
      phone: '555-0100',
      email: 'alice@abc.com',
      isActive: true,
      createdAt: new Date('2026-06-21T12:00:00Z'),
      updatedAt: new Date('2026-06-21T12:00:00Z'),
    };
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([created]));

    const res = await POST(
      new Request('http://localhost/api/maintenance/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'ABC Plumbing',
          trade: 'PLUMBING',
          contactName: 'Alice Smith',
          phone: '555-0100',
          email: 'alice@abc.com',
        }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect((body as any).data.contactName).toBe('Alice Smith');
    expect((body as any).data.phone).toBe('555-0100');
    expect((body as any).data.email).toBe('alice@abc.com');
  });
});
