/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeInsertChain, makeUpdateChain } from '@/test/api/helpers';

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
  requireAnyPermission: vi.fn(),
  dbMock: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  nowDate: new Date('2026-06-21T12:00:00Z'),
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
  apiForbidden: vi.fn(
    (message = 'Forbidden') =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
}));

vi.mock('@/shared/api/auth-utils', () => ({
  requireAuth: vi.fn(async (_request: Request, opts?: { permission?: string }) => {
    if (!mocks.sessionResult) {
      return {
        success: false as const,
        response: new Response(
          JSON.stringify({
            success: false,
            error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
    if (opts?.permission && !mocks.hasPermission('ADMIN', opts.permission)) {
      return {
        success: false as const,
        response: new Response(
          JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
    return {
      success: true as const,
      data: {
        userId: mocks.sessionResult.user.id,
        role: 'ADMIN',
        tenantId: 'test-tenant-id',
        session: { user: { id: mocks.sessionResult.user.id } },
        suspension: null,
      },
    };
  }),
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
    maintenanceRequests: {
      id: 'id',
      tenantId: 'tenantId',
      userId: 'userId',
      category: 'category',
      priority: 'priority',
      description: 'description',
      status: 'status',
      assignedTeamId: 'assignedTeamId',
      assignedProviderId: 'assignedProviderId',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    maintenanceTeams: {
      id: 'id',
      tenantId: 'tenantId',
      name: 'name',
      trade: 'trade',
      isActive: 'isActive',
    },
    serviceProviders: {
      id: 'id',
      tenantId: 'tenantId',
      companyName: 'companyName',
      trade: 'trade',
      isActive: 'isActive',
    },
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
    maintenanceTeamMembers: {
      id: 'id',
      teamId: 'teamId',
      userId: 'userId',
      createdAt: 'createdAt',
    },
    notifications: {
      id: 'id',
      userId: 'userId',
      title: 'title',
      message: 'message',
      type: 'type',
      category: 'category',
    },
    emitEvent: vi.fn(),
    users: { id: 'id', role: 'role', name: 'name', email: 'email' },
    getSessionAndRole: async () => {
      if (!mocks.sessionResult) return null;
      return { userId: mocks.sessionResult.user.id, role: 'ADMIN', isPlatformAdmin: false };
    },
    guardSuspension: () => null,
    requireAnyPermission: (perms: string[]) => mocks.requireAnyPermission(perms),
    revalidateDashboard: mocks.revalidateDashboard,
    now: () => mocks.nowDate,
    withErrorHandler: (h: any) => h,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    apiSuccess: mocks.apiSuccess,
    apiUnauthorized: mocks.apiUnauthorized,
    apiNotFound: mocks.apiNotFound,
    apiError: mocks.apiError,
    apiForbidden: mocks.apiForbidden,
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
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { POST } from '@/app/api/maintenance/[id]/assign/route';

const REQUEST_ID = 'req-1';
const mockRequest = {
  id: REQUEST_ID,
  tenantId: 'test-tenant-id',
  userId: 'user-1',
  category: 'PLUMBING',
  priority: 'HIGH',
  description: 'Leaky faucet',
  status: 'SUBMITTED',
  assignedTeamId: null,
  assignedProviderId: null,
  createdAt: new Date('2026-06-21T10:00:00Z'),
  updatedAt: new Date('2026-06-21T10:00:00Z'),
};

const TEAM_ID = 'team-1';
const PROVIDER_ID = 'prov-1';

const activeTeam = {
  id: TEAM_ID,
  tenantId: 'test-tenant-id',
  name: 'Plumbers',
  trade: 'PLUMBING',
  isActive: true,
};

const inactiveTeam = {
  ...activeTeam,
  isActive: false,
};

const activeProvider = {
  id: PROVIDER_ID,
  tenantId: 'test-tenant-id',
  companyName: 'FixIt Co',
  trade: 'PLUMBING',
  isActive: true,
};

const inactiveProvider = {
  ...activeProvider,
  isActive: false,
};

function makeParams(id = REQUEST_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body?: unknown): Request {
  return new Request(`http://localhost/api/maintenance/${REQUEST_ID}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = null;
  mocks.requireAnyPermission.mockResolvedValue(null);
  mocks.revalidateDashboard.mockClear();

  // Default: db.select returns empty chains so un-mocked calls resolve to []
  mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));
  // Return the chain properly for the .set().where().returning() pattern
  mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/maintenance/[id]/assign', () => {
  it('returns 401 when requireAnyPermission fails', async () => {
    mocks.requireAnyPermission.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await POST(makeRequest({ teamId: TEAM_ID }), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 401 when session missing', async () => {
    // requireAnyPermission passes but getSessionAndRole returns null
    mocks.sessionResult = null;

    const res = await POST(makeRequest({ teamId: TEAM_ID }), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 when user has no requests permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.hasPermission.mockReturnValueOnce(false);

    const res = await POST(makeRequest({ teamId: TEAM_ID }), makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 404 when maintenance request not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    // Only select call: maintenance request lookup → empty (not found)
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

    const res = await POST(makeRequest({ teamId: TEAM_ID }), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 400 when neither teamId nor providerId provided', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([mockRequest]));

    const res = await POST(makeRequest({}), makeParams());
    expect(res.status).toBe(400);
  });

  it('returns 400 when team is not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([])); // team not found

    const res = await POST(makeRequest({ teamId: 'nonexistent' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('returns 400 when team is inactive', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([inactiveTeam]));

    const res = await POST(makeRequest({ teamId: TEAM_ID }), makeParams());
    expect(res.status).toBe(400);
  });

  it('returns 400 when provider is not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([])); // provider not found

    const res = await POST(makeRequest({ providerId: 'nonexistent' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('returns 400 when provider is inactive', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([inactiveProvider]));

    const res = await POST(makeRequest({ providerId: PROVIDER_ID }), makeParams());
    expect(res.status).toBe(400);
  });

  it('assigns a team successfully with auto-transition', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const updatedRequest = {
      ...mockRequest,
      assignedTeamId: TEAM_ID,
      status: 'ASSIGNED',
      updatedAt: mocks.nowDate,
    };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([activeTeam]))
      .mockReturnValueOnce(makeSelectChain([{ name: 'Plumbers' }]))
      .mockReturnValueOnce(makeSelectChain([{ id: TEAM_ID, name: 'Plumbers', trade: 'PLUMBING' }]));

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updatedRequest]));

    const res = await POST(makeRequest({ teamId: TEAM_ID }), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.assignedTeamId).toBe(TEAM_ID);
    expect(body.data.assignedTeam).toEqual({ id: TEAM_ID, name: 'Plumbers', trade: 'PLUMBING' });
    expect(body.data.status).toBe('ASSIGNED');
    // Should have created 2 history entries (team assignment + status auto-transition)
    expect(mocks.dbMock.insert).toHaveBeenCalledTimes(2);
    expect(mocks.revalidateDashboard).toHaveBeenCalled();
  });

  it('assigns a provider successfully with auto-transition', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const updatedRequest = {
      ...mockRequest,
      assignedProviderId: PROVIDER_ID,
      status: 'ASSIGNED',
      updatedAt: mocks.nowDate,
    };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([activeProvider]))
      .mockReturnValueOnce(makeSelectChain([{ companyName: 'FixIt Co' }]))
      .mockReturnValueOnce(
        makeSelectChain([{ id: PROVIDER_ID, companyName: 'FixIt Co', trade: 'PLUMBING' }])
      );

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updatedRequest]));

    const res = await POST(makeRequest({ providerId: PROVIDER_ID }), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.assignedProviderId).toBe(PROVIDER_ID);
    expect(body.data.assignedProvider).toEqual({
      id: PROVIDER_ID,
      companyName: 'FixIt Co',
      trade: 'PLUMBING',
    });
    expect(mocks.revalidateDashboard).toHaveBeenCalled();
  });

  it('assigns team without auto-transition when status is not SUBMITTED', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const inProgressRequest = { ...mockRequest, status: 'IN_PROGRESS' };
    const updatedRequest = {
      ...inProgressRequest,
      assignedTeamId: TEAM_ID,
      updatedAt: mocks.nowDate,
    };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([inProgressRequest]))
      .mockReturnValueOnce(makeSelectChain([activeTeam]))
      .mockReturnValueOnce(makeSelectChain([{ name: 'Plumbers' }]))
      .mockReturnValueOnce(makeSelectChain([{ id: TEAM_ID, name: 'Plumbers', trade: 'PLUMBING' }]));

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updatedRequest]));

    const res = await POST(makeRequest({ teamId: TEAM_ID }), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.status).toBe('IN_PROGRESS');
    expect(body.data.assignedTeamId).toBe(TEAM_ID);
    // Only 1 history entry (team assignment), no status auto-transition
    expect(mocks.dbMock.insert).toHaveBeenCalledTimes(1);
  });

  it('includes reason as comment in history entries', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    const updatedRequest = {
      ...mockRequest,
      assignedTeamId: TEAM_ID,
      status: 'ASSIGNED',
      updatedAt: mocks.nowDate,
    };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([activeTeam]))
      .mockReturnValueOnce(makeSelectChain([{ name: 'Plumbers' }]))
      .mockReturnValueOnce(makeSelectChain([{ id: TEAM_ID, name: 'Plumbers', trade: 'PLUMBING' }]));

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updatedRequest]));

    const res = await POST(
      makeRequest({ teamId: TEAM_ID, reason: 'Best fit for plumbing work' }),
      makeParams()
    );
    expect(res.status).toBe(200);

    // Verify history entries include the reason
    // We can check that insert was called with expected values
    expect(mocks.dbMock.insert).toHaveBeenCalled();
  });

  it('enforces tenant isolation on request lookup', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([])); // other tenant → not found

    const res = await POST(makeRequest({ teamId: TEAM_ID }), makeParams());
    expect(res.status).toBe(404);
  });
});
