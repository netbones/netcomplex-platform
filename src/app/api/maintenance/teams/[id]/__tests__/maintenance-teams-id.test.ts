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
  requireAnyPermission: vi.fn(),
  notDeleted: vi.fn(() => true),
  dbMock: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
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
  apiGone: vi.fn(
    (message = 'Resource has been deleted') =>
      new Response(JSON.stringify({ success: false, error: { code: 'GONE', message } }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    db: mocks.dbMock,
    maintenanceTeams: {
      id: 'id',
      tenantId: 'tenantId',
      name: 'name',
      trade: 'trade',
      contactName: 'contactName',
      isActive: 'isActive',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      deletedAt: 'deletedAt',
    },
    notDeleted: mocks.notDeleted,
    now: () => new Date('2026-06-21T12:00:00Z'),
    requireAnyPermission: (perms: string[]) => mocks.requireAnyPermission(perms),
    apiSuccess: mocks.apiSuccess,
    apiNotFound: mocks.apiNotFound,
    apiGone: mocks.apiGone,
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

import { PATCH, DELETE } from '@/app/api/maintenance/teams/[id]/route';

const TEAM_ID = 'team-1';
const activeTeam = {
  id: TEAM_ID,
  tenantId: 'test-tenant-id',
  name: 'Plumbers',
  trade: 'PLUMBING',
  contactName: 'Alice',
  isActive: true,
  createdAt: new Date('2026-06-21T10:00:00Z'),
  updatedAt: new Date('2026-06-21T10:00:00Z'),
  deletedAt: null,
};

function makeRequest(method: string, body?: unknown): Request {
  return new Request(`http://localhost/api/maintenance/teams/${TEAM_ID}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeParams(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: TEAM_ID }) };
}

describe('PATCH /api/maintenance/teams/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAnyPermission.mockResolvedValue(null);
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
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

    const res = await PATCH(makeRequest('PATCH', { name: 'Updated' }), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when team not found', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const res = await PATCH(makeRequest('PATCH', { name: 'Updated' }), makeParams());

    expect(mocks.apiNotFound).toHaveBeenCalled();
    expect(res.status).toBe(404);
  });

  it('returns 404 when team is soft-deleted (filtered by notDeleted)', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const res = await PATCH(makeRequest('PATCH', { name: 'Updated' }), makeParams());

    expect(mocks.apiNotFound).toHaveBeenCalled();
    expect(res.status).toBe(404);
  });

  it('updates team name successfully', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([activeTeam]));

    const updated = {
      ...activeTeam,
      name: 'Updated Plumbers',
      updatedAt: new Date('2026-06-21T12:00:00Z'),
    };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(makeRequest('PATCH', { name: 'Updated Plumbers' }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.name).toBe('Updated Plumbers');
  });

  it('updates team trade successfully', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([activeTeam]));

    const updated = { ...activeTeam, trade: 'HVAC', updatedAt: new Date('2026-06-21T12:00:00Z') };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(makeRequest('PATCH', { trade: 'HVAC' }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.trade).toBe('HVAC');
  });

  it('updates team contactName successfully', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([activeTeam]));

    const updated = {
      ...activeTeam,
      contactName: 'Bob',
      updatedAt: new Date('2026-06-21T12:00:00Z'),
    };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(makeRequest('PATCH', { contactName: 'Bob' }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.contactName).toBe('Bob');
  });

  it('toggles isActive successfully', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([activeTeam]));

    const updated = { ...activeTeam, isActive: false, updatedAt: new Date('2026-06-21T12:00:00Z') };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(makeRequest('PATCH', { isActive: false }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.isActive).toBe(false);
  });

  it('updates multiple fields at once', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([activeTeam]));

    const updated = {
      ...activeTeam,
      name: 'HVAC Pros',
      trade: 'HVAC',
      contactName: 'Charlie',
      updatedAt: new Date('2026-06-21T12:00:00Z'),
    };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const res = await PATCH(
      makeRequest('PATCH', { name: 'HVAC Pros', trade: 'HVAC', contactName: 'Charlie' }),
      makeParams()
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.name).toBe('HVAC Pros');
    expect((body as any).data.trade).toBe('HVAC');
    expect((body as any).data.contactName).toBe('Charlie');
  });
});

describe('DELETE /api/maintenance/teams/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAnyPermission.mockResolvedValue(null);
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
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

    const res = await DELETE(makeRequest('DELETE'), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when team not found', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const res = await DELETE(makeRequest('DELETE'), makeParams());

    expect(mocks.apiNotFound).toHaveBeenCalled();
    expect(res.status).toBe(404);
  });

  it('soft-deletes a team successfully', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([activeTeam]));
    mocks.dbMock.update.mockReturnValue(
      makeUpdateChain([{ ...activeTeam, deletedAt: new Date('2026-06-21T12:00:00Z') }])
    );

    const res = await DELETE(makeRequest('DELETE'), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.success).toBe(true);
    expect((body as any).data.deleted).toBe(true);
  });
});
