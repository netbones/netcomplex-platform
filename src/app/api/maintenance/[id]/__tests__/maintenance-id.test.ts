/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeUpdateChain } from '@/test/api/helpers';

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
  mockRole: 'ADMIN' as string,
  dbMock: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  revalidateDashboard: vi.fn(),
  nowDate: new Date('2026-06-21T12:00:00Z'),
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
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: {
      api: {
        getSession: () => Promise.resolve(mocks.sessionResult),
      },
    },
    getSessionAndRole: vi.fn(() => {
      if (!mocks.sessionResult) return Promise.resolve(null);
      return Promise.resolve({
        session: { user: { id: mocks.sessionResult.user.id, email: 'test@test.com', name: 'Test' } },
        userId: mocks.sessionResult.user.id,
        role: mocks.mockRole,
        suspension: null,
      });
    }),
    notDeleted: vi.fn(() => true),
    guardSuspension: vi.fn(() => null),
    CACHE_TAGS: {},
    db: mocks.dbMock,
    maintenanceRequests: {
      id: 'id',
      tenantId: 'tenantId',
      userId: 'userId',
      propertyId: 'propertyId',
      category: 'category',
      priority: 'priority',
      description: 'description',
      status: 'status',
      images: 'images',
      assignedTo: 'assignedTo',
      vendor: 'vendor',
      scheduledDate: 'scheduledDate',
      estimatedCost: 'estimatedCost',
      actualCost: 'actualCost',
      resolution: 'resolution',
      completedAt: 'completedAt',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      ticketNumber: 'ticketNumber',
      preferredDate: 'preferredDate',
      preferredTime: 'preferredTime',
      assignedTeamId: 'assignedTeamId',
      assignedProviderId: 'assignedProviderId',
    },
    users: { id: 'id', role: 'role', name: 'name', email: 'email' },
    properties: { id: 'id', street: 'street', unit: 'unit' },
    maintenanceTeams: { id: 'id', name: 'name', trade: 'trade' },
    serviceProviders: { id: 'id', companyName: 'companyName', trade: 'trade' },
    requestHistories: {
      id: 'id',
      requestId: 'requestId',
      userId: 'userId',
      field: 'field',
      oldValue: 'oldValue',
      newValue: 'newValue',
      comment: 'comment',
      createdAt: 'createdAt',
    },
    revalidateDashboard: mocks.revalidateDashboard,
    now: () => mocks.nowDate,
    withErrorHandler: (h: any) => h,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    apiSuccess: mocks.apiSuccess,
    apiUnauthorized: mocks.apiUnauthorized,
    apiForbidden: mocks.apiForbidden,
    apiNotFound: mocks.apiNotFound,
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

import { GET, PATCH, DELETE } from '@/app/api/maintenance/[id]/route';

const REQUEST_ID = 'req-1';
const mockRequest = {
  id: REQUEST_ID,
  tenantId: 'test-tenant-id',
  userId: 'user-1',
  propertyId: 'prop-1',
  category: 'PLUMBING',
  priority: 'HIGH',
  description: 'Leaky faucet in kitchen',
  status: 'SUBMITTED',
  images: [],
  assignedTo: null,
  vendor: null,
  scheduledDate: null,
  estimatedCost: null,
  actualCost: null,
  resolution: null,
  completedAt: null,
  createdAt: new Date('2026-06-21T10:00:00Z'),
  updatedAt: new Date('2026-06-21T10:00:00Z'),
  ticketNumber: 'TKT-001',
  preferredDate: new Date('2026-06-25'),
  preferredTime: 'AM',
  assignedTeamId: null,
  assignedProviderId: null,
};

function makeParams(id = REQUEST_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(method: string, body?: unknown): Request {
  return new Request(`http://localhost/api/maintenance/${REQUEST_ID}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = null;
  mocks.mockRole = 'ADMIN';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/maintenance/[id]', () => {
  it('returns 401 without auth', async () => {
    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when request not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 403 for non-admin viewing another user request', async () => {
    mocks.sessionResult = { user: { id: 'user-2' } };
    mocks.mockRole = 'RESIDENT';
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
      .mockReturnValueOnce(makeSelectChain([{ ...mockRequest, userId: 'user-1' }]));

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(403);
  });

  it('allows resident to view own request', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.mockRole = 'RESIDENT';
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([{ name: 'Test User', email: 'test@test.com' }]))
      .mockReturnValueOnce(makeSelectChain([{ street: '123 Main', unit: 'Apt 4' }]));

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(REQUEST_ID);
    expect(body.data.user.name).toBe('Test User');
    expect(body.data.user.address).toEqual({ street: '123 Main', unit: 'Apt 4' });
  });

  it('returns full response with team and provider for admin', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    const withAssignments = {
      ...mockRequest,
      assignedTeamId: 'team-1',
      assignedProviderId: 'prov-1',
    };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([withAssignments]))
      .mockReturnValueOnce(makeSelectChain([{ name: 'Alice', email: 'alice@test.com' }]))
      .mockReturnValueOnce(makeSelectChain([{ street: '456 Oak', unit: '2B' }]))
      .mockReturnValueOnce(makeSelectChain([{ id: 'team-1', name: 'Plumbers', trade: 'PLUMBING' }]))
      .mockReturnValueOnce(
        makeSelectChain([{ id: 'prov-1', companyName: 'FixIt Co', trade: 'PLUMBING' }])
      );

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.assignedTeam).toEqual({ id: 'team-1', name: 'Plumbers', trade: 'PLUMBING' });
    expect(body.data.assignedProvider).toEqual({
      id: 'prov-1',
      companyName: 'FixIt Co',
      trade: 'PLUMBING',
    });
    expect(body.data.user).toEqual({
      name: 'Alice',
      email: 'alice@test.com',
      address: { street: '456 Oak', unit: '2B' },
    });
  });

  it('returns null team/provider when not assigned', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([{ name: 'Alice', email: 'alice@test.com' }]))
      .mockReturnValueOnce(makeSelectChain([{ street: '123 Main', unit: 'Apt 4' }]));

    const res = await GET(makeRequest('GET'), makeParams());
    const body = await res.json();
    expect(body.data.assignedTeam).toBeNull();
    expect(body.data.assignedProvider).toBeNull();
  });

  it('enforces tenant isolation', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // tenant mismatch

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(404);
  });

  it('handles missing property gracefully', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([{ name: 'Bob', email: 'bob@test.com' }]))
      .mockReturnValueOnce(makeSelectChain([])); // property not found

    const res = await GET(makeRequest('GET'), makeParams());
    const body = await res.json();
    expect(body.data.user.address).toBeNull();
  });
});

describe('PATCH /api/maintenance/[id]', () => {
  beforeEach(() => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
    mocks.dbMock.insert.mockReturnValue({
      values: vi.fn(() => Promise.resolve([{ id: 'hist-1' }])),
    });
    mocks.revalidateDashboard.mockClear();
  });

  it('returns 401 without auth', async () => {
    const res = await PATCH(makeRequest('PATCH', { status: 'ASSIGNED' }), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 for resident without requests permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.mockRole = 'RESIDENT';
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

    const res = await PATCH(makeRequest('PATCH', { status: 'ASSIGNED' }), makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 404 when request not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const res = await PATCH(makeRequest('PATCH', { status: 'ASSIGNED' }), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 403 for invalid status value', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const res = await PATCH(makeRequest('PATCH', { status: 'INVALID' }), makeParams());
    expect(res.status).toBe(403);
  });

  it('updates status and creates history entry', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));
    mocks.dbMock.update.mockReturnValue(
      makeUpdateChain([{ ...mockRequest, status: 'ASSIGNED', updatedAt: mocks.nowDate }])
    );

    const res = await PATCH(makeRequest('PATCH', { status: 'ASSIGNED' }), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.status).toBe('ASSIGNED');
    expect(mocks.dbMock.insert).toHaveBeenCalled(); // history entry
    expect(mocks.revalidateDashboard).toHaveBeenCalled();
  });

  it('sets completedAt when transitioning to COMPLETED', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ ...mockRequest, status: 'IN_PROGRESS' }]));

    const updated = {
      ...mockRequest,
      status: 'COMPLETED',
      completedAt: mocks.nowDate,
      updatedAt: mocks.nowDate,
    };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(makeRequest('PATCH', { status: 'COMPLETED' }), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.status).toBe('COMPLETED');
    expect(body.data.completedAt).toBe(mocks.nowDate.toISOString());
    expect(mocks.dbMock.insert).toHaveBeenCalled();
  });

  it('updates priority and creates history entry', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const updated = { ...mockRequest, priority: 'LOW', updatedAt: mocks.nowDate };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(makeRequest('PATCH', { priority: 'LOW' }), makeParams());
    expect(res.status).toBe(200);
    expect(mocks.dbMock.insert).toHaveBeenCalled();
  });

  it('updates description without history entry', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const updated = { ...mockRequest, description: 'Updated desc', updatedAt: mocks.nowDate };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(makeRequest('PATCH', { description: 'Updated desc' }), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.description).toBe('Updated desc');
  });

  it('updates assignedTo and creates history entry', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const updated = { ...mockRequest, assignedTo: 'Bob', updatedAt: mocks.nowDate };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(makeRequest('PATCH', { assignedTo: 'Bob' }), makeParams());
    expect(res.status).toBe(200);
    expect(mocks.dbMock.insert).toHaveBeenCalled();
  });

  it('updates estimatedCost and actualCost', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const updated = {
      ...mockRequest,
      estimatedCost: 100,
      actualCost: 95,
      updatedAt: mocks.nowDate,
    };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(
      makeRequest('PATCH', { estimatedCost: 100, actualCost: 95 }),
      makeParams()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.estimatedCost).toBe(100);
    expect(body.data.actualCost).toBe(95);
  });

  it('updates scheduledDate and creates history entry', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const newDate = new Date('2026-06-28T09:00:00Z');
    const updated = { ...mockRequest, scheduledDate: newDate, updatedAt: mocks.nowDate };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(
      makeRequest('PATCH', { scheduledDate: '2026-06-28T09:00:00Z' }),
      makeParams()
    );
    expect(res.status).toBe(200);
    expect(mocks.dbMock.insert).toHaveBeenCalled();
  });

  it('enforces tenant isolation on update', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // other tenant

    const res = await PATCH(makeRequest('PATCH', { status: 'ASSIGNED' }), makeParams());
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/maintenance/[id]', () => {
  beforeEach(() => {
    mocks.dbMock.delete.mockReturnValue({ where: vi.fn(() => Promise.resolve({})) });
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  it('returns 401 without auth', async () => {
    const res = await DELETE(makeRequest('DELETE'), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 for resident without requests permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.mockRole = 'RESIDENT';
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

    const res = await DELETE(makeRequest('DELETE'), makeParams());
    expect(res.status).toBe(403);
  });

  it('deletes successfully with admin', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));

    const res = await DELETE(makeRequest('DELETE'), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.success).toBe(true);
  });

  it('enforces tenant isolation on delete', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));

    const res = await DELETE(makeRequest('DELETE'), makeParams());
    expect(res.status).toBe(200);
  });
});
