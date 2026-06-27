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
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  revalidateContent: vi.fn(),
  nowDate: new Date('2026-06-21T12:00:00Z'),
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
  apiGone: vi.fn(
    (message = 'This record has been deleted') =>
      new Response(JSON.stringify({ success: false, error: { code: 'GONE', message } }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string, status = 400) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  notDeleted: vi.fn((t: any) => ({ isNull: [t, 'deletedAt'] })),
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  competitions: {
    id: 'id',
    tenantId: 'tenantId',
    title: 'title',
    description: 'description',
    rules: 'rules',
    prizeInfo: 'prizeInfo',
    startDate: 'startDate',
    endDate: 'endDate',
    status: 'status',
    image: 'image',
    type: 'type',
    winnersCount: 'winnersCount',
    maxParticipants: 'maxParticipants',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
  },
  users: { id: 'id', role: 'role' },
  revalidateContent: mocks.revalidateContent,
  now: vi.fn(() => mocks.nowDate),
  withErrorHandler: vi.fn((handler: any) => handler as never),
  apiSuccess: mocks.apiSuccess,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiNotFound: mocks.apiNotFound,
  apiGone: mocks.apiGone,
  apiError: mocks.apiError,
  notDeleted: mocks.notDeleted,
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  assertModuleEnabled: vi.fn(),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'content')
      return role === 'ADMIN' || role === 'MANAGER' || role === 'COMMITTEE';
    if (permission === 'contentOwn') return role === 'ADMIN' || role === 'COMMITTEE';
    return false;
  }),
}));

import { GET, PATCH, DELETE } from '@/app/api/competitions/[id]/route';

const COMP_ID = 'comp-1';
const mockCompetition = {
  id: COMP_ID,
  tenantId: 'test-tenant-id',
  title: 'Photo Contest',
  description: 'Best summer photo',
  rules: null,
  prizeInfo: '$100 gift card',
  startDate: new Date('2026-06-01'),
  endDate: new Date('2026-07-01'),
  status: 'ACTIVE',
  entryCount: 12,
  image: null,
  type: 'RAFFLE',
  winnersCount: 1,
  maxParticipants: null,
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
  deletedAt: null,
};

function makeParams(id = COMP_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(method: string, body?: unknown): Request {
  return new Request(`http://localhost/api/competitions/${COMP_ID}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/competitions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const response = await GET(makeRequest('GET'), makeParams());
    expect(response.status).toBe(401);
  });

  it('returns 404 when competition not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const response = await GET(makeRequest('GET'), makeParams());
    expect(response.status).toBe(404);
  });

  it('returns 200 with competition data', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([mockCompetition]));

    const response = await GET(makeRequest('GET'), makeParams());
    expect(response.status).toBe(200);
    expect(mocks.apiSuccess).toHaveBeenCalledWith(mockCompetition);
  });

  it('enforces tenant isolation in where clause', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    await GET(makeRequest('GET'), makeParams());

    expect(mocks.dbMock.select).toHaveBeenCalled();
    const chain = mocks.dbMock.select.mock.results[0]?.value;
    expect(chain.where).toHaveBeenCalled();
  });
});

describe('PATCH /api/competitions/[id]', () => {
  const updateBody = { title: 'Updated Contest' };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const response = await PATCH(makeRequest('PATCH', updateBody), makeParams());
    expect(response.status).toBe(401);
  });

  it('returns 403 when user lacks content permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

    const response = await PATCH(makeRequest('PATCH', updateBody), makeParams());
    expect(response.status).toBe(403);
  });

  it('returns 404 when competition does not exist', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const response = await PATCH(makeRequest('PATCH', updateBody), makeParams());
    expect(response.status).toBe(404);
  });

  it('returns 410 when competition is soft-deleted', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: '2026-06-20T10:00:00Z' }]));

    const response = await PATCH(makeRequest('PATCH', updateBody), makeParams());
    expect(response.status).toBe(410);
    expect(mocks.apiGone).toHaveBeenCalled();
  });

  it('updates competition with valid data and returns 200', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };

    const updated = {
      ...mockCompetition,
      title: 'Updated Contest',
      description: 'Updated description',
      updatedAt: mocks.nowDate,
    };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const response = await PATCH(
      makeRequest('PATCH', { title: 'Updated Contest', description: 'Updated description' }),
      makeParams()
    );
    expect(response.status).toBe(200);
    expect(mocks.revalidateContent).toHaveBeenCalled();
  });

  it('accepts partial updates for optional fields', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };

    const updated = { ...mockCompetition, prizeInfo: 'New prize', updatedAt: mocks.nowDate };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const response = await PATCH(makeRequest('PATCH', { prizeInfo: 'New prize' }), makeParams());
    expect(response.status).toBe(200);
  });

  it('revalidates content after successful update', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));

    mocks.dbMock.update.mockReturnValue(
      makeUpdateChain([{ ...mockCompetition, updatedAt: mocks.nowDate }])
    );

    await PATCH(makeRequest('PATCH', { title: 'Updated' }), makeParams());
    expect(mocks.revalidateContent).toHaveBeenCalledTimes(1);
  });
});

describe('DELETE /api/competitions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const response = await DELETE(makeRequest('DELETE'), makeParams());
    expect(response.status).toBe(401);
  });

  it('returns 403 when user lacks content permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

    const response = await DELETE(makeRequest('DELETE'), makeParams());
    expect(response.status).toBe(403);
  });

  it('returns 404 when competition not found (update returns empty)', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const response = await DELETE(makeRequest('DELETE'), makeParams());
    expect(response.status).toBe(404);
  });

  it('soft-deletes competition and returns success', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.dbMock.update.mockReturnValue(
      makeUpdateChain([{ ...mockCompetition, deletedAt: mocks.nowDate, updatedAt: mocks.nowDate }])
    );

    const response = await DELETE(makeRequest('DELETE'), makeParams());
    expect(response.status).toBe(200);
    expect(mocks.revalidateContent).toHaveBeenCalled();
  });

  it('revalidates content after successful delete', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.dbMock.update.mockReturnValue(
      makeUpdateChain([{ ...mockCompetition, deletedAt: mocks.nowDate, updatedAt: mocks.nowDate }])
    );

    await DELETE(makeRequest('DELETE'), makeParams());
    expect(mocks.revalidateContent).toHaveBeenCalledTimes(1);
  });
});
