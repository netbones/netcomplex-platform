/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeInsertChain } from '@/test/api/helpers';

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
  dbMock: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  revalidateDashboard: vi.fn(),
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'requests') return role === 'ADMIN' || role === 'MANAGER';
    return false;
  }),
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
  apiUnauthorized: vi.fn(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiForbidden: vi.fn(
    (message = 'Forbidden') =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiNotFound: vi.fn(
    (message = 'Not found') =>
      new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message } }), {
        status: 404,
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
    auth: {
      api: {
        getSession: () => Promise.resolve(mocks.sessionResult),
      },
    },
    db: mocks.dbMock,
    requestHistories: {
      id: 'id',
      requestId: 'requestId',
      field: 'field',
      oldValue: 'oldValue',
      newValue: 'newValue',
      comment: 'comment',
      createdAt: 'createdAt',
      userId: 'userId',
    },
    users: { id: 'id', role: 'role', name: 'name', email: 'email' },
    getSessionAndRole: async () => {
      if (!mocks.sessionResult) return null;
      return { userId: mocks.sessionResult.user.id, role: 'ADMIN', isPlatformAdmin: false };
    },
    guardSuspension: () => null,
    maintenanceRequests: {
      id: 'id',
      tenantId: 'tenantId',
      userId: 'userId',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    revalidateDashboard: mocks.revalidateDashboard,
    withErrorHandler: (h: any) => h,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    apiSuccess: mocks.apiSuccess,
    apiCreated: mocks.apiCreated,
    apiUnauthorized: mocks.apiUnauthorized,
    apiForbidden: mocks.apiForbidden,
    apiNotFound: mocks.apiNotFound,
    apiError: mocks.apiError,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: Parameters<typeof mocks.hasPermission>) => mocks.hasPermission(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { GET, POST } from '@/app/api/maintenance/[id]/history/route';

const REQUEST_ID = 'req-1';
const mockRequest = {
  id: REQUEST_ID,
  tenantId: 'test-tenant-id',
  userId: 'user-1',
  status: 'SUBMITTED',
  createdAt: new Date('2026-06-21T10:00:00Z'),
  updatedAt: new Date('2026-06-21T10:00:00Z'),
};

const historyEntries = [
  {
    id: 'hist-3',
    requestId: REQUEST_ID,
    field: 'status',
    oldValue: 'ASSIGNED',
    newValue: 'IN_PROGRESS',
    comment: 'Started work',
    createdAt: new Date('2026-06-21T11:30:00Z'),
    user: { id: 'admin-1', name: 'Admin User' },
  },
  {
    id: 'hist-2',
    requestId: REQUEST_ID,
    field: 'assignedTeam',
    oldValue: 'Unassigned',
    newValue: 'Plumbers',
    comment: null,
    createdAt: new Date('2026-06-21T11:00:00Z'),
    user: { id: 'admin-1', name: 'Admin User' },
  },
  {
    id: 'hist-1',
    requestId: REQUEST_ID,
    field: 'status',
    oldValue: 'SUBMITTED',
    newValue: 'ASSIGNED',
    comment: 'Auto-transitioned on team assignment',
    createdAt: new Date('2026-06-21T10:30:00Z'),
    user: { id: 'user-1', name: 'Test User' },
  },
];

function makeParams(id = REQUEST_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(method: string, body?: unknown): Request {
  return new Request(`http://localhost/api/maintenance/${REQUEST_ID}/history`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = null;
  mocks.revalidateDashboard.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/maintenance/[id]/history', () => {
  beforeEach(() => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  it('returns 401 without auth', async () => {
    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 without requests permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 404 when maintenance request not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // MR not found

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns history entries for authorized user', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain(historyEntries));

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(3);
    expect(body.data[0].field).toBe('status');
    expect(body.data[0].user.name).toBe('Admin User');
  });

  it('returns empty array when no history exists', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([]));

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('includes user name in each history entry', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain(historyEntries));

    const res = await GET(makeRequest('GET'), makeParams());
    const body = await res.json();

    body.data.forEach((entry: any) => {
      expect(entry.user).toBeDefined();
      expect(entry.user.name).toBeDefined();
    });
  });

  it('enforces tenant isolation', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // other tenant

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(404);
  });
});

describe('POST /api/maintenance/[id]/history', () => {
  beforeEach(() => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));
  });

  it('returns 401 without auth', async () => {
    const res = await POST(
      makeRequest('POST', { field: 'status', newValue: 'ASSIGNED' }),
      makeParams()
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 without requests permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

    const res = await POST(
      makeRequest('POST', { field: 'status', newValue: 'ASSIGNED' }),
      makeParams()
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when maintenance request not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // MR not found

    const res = await POST(
      makeRequest('POST', { field: 'status', newValue: 'ASSIGNED' }),
      makeParams()
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 when field is missing', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const res = await POST(makeRequest('POST', { newValue: 'ASSIGNED' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('returns 400 when newValue is missing', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const res = await POST(makeRequest('POST', { field: 'status' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('returns 201 and creates history entry with all fields', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const createdEntry = {
      id: 'hist-new',
      requestId: REQUEST_ID,
      field: 'priority',
      oldValue: 'HIGH',
      newValue: 'LOW',
      comment: 'Reducing priority',
      createdAt: new Date('2026-06-21T12:00:00Z'),
    };
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([createdEntry]));

    const res = await POST(
      makeRequest('POST', {
        field: 'priority',
        oldValue: 'HIGH',
        newValue: 'LOW',
        comment: 'Reducing priority',
      }),
      makeParams()
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.field).toBe('priority');
    expect(body.data.oldValue).toBe('HIGH');
    expect(body.data.newValue).toBe('LOW');
    expect(body.data.comment).toBe('Reducing priority');
  });

  it('calls revalidateDashboard after creation', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    mocks.dbMock.insert.mockReturnValue(
      makeInsertChain([
        {
          id: 'hist-new',
          requestId: REQUEST_ID,
          field: 'status',
          oldValue: null,
          newValue: 'ASSIGNED',
          comment: null,
          createdAt: new Date(),
        },
      ])
    );

    await POST(makeRequest('POST', { field: 'status', newValue: 'ASSIGNED' }), makeParams());
    expect(mocks.revalidateDashboard).toHaveBeenCalled();
  });

  it('enforces tenant isolation', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // other tenant

    const res = await POST(
      makeRequest('POST', { field: 'status', newValue: 'ASSIGNED' }),
      makeParams()
    );
    expect(res.status).toBe(404);
  });
});
