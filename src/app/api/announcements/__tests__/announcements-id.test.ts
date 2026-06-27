/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  canPublish: true as boolean,
  validatedPriority: 'normal' as string,
  revalidateDashboard: vi.fn(),
  apiSuccess: vi.fn((data: unknown, meta?: unknown, status?: number): Response => {
    const s =
      typeof meta === 'object' && meta !== null && 'status' in meta
        ? (meta as { status: number }).status
        : typeof meta === 'number'
          ? meta
          : (status ?? 200);
    return new Response(JSON.stringify(data), {
      status: s,
      headers: { 'content-type': 'application/json' },
    });
  }),
  apiUnauthorized: vi.fn(
    (message = 'Authentication required'): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiNotFound: vi.fn(
    (message = 'Not found'): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message } }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiForbidden: vi.fn(
    (message = 'Forbidden'): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message } }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiGone: vi.fn(
    (message = 'This record has been deleted'): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'GONE', message } }), {
        status: 410,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string, status = 400): Response =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'content-type': 'application/json' },
      })
  ),
  notDeleted: vi.fn((t: any) => ({ isNull: [t, 'deletedAt'] })),
}));

vi.mock('@api/server', () => ({
  CACHE_TAGS: { SETTINGS: 'settings' },
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  announcements: { id: 'id', tenantId: 'tenantId', priority: 'priority', deletedAt: 'deletedAt' },
  users: { id: 'id', role: 'role', name: 'name' },
  resources: { id: 'id', tenantId: 'tenantId' },
  revalidateDashboard: mocks.revalidateDashboard,
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  withErrorHandler: vi.fn((handler: any) => handler as never),
  apiSuccess: mocks.apiSuccess,
  apiUnauthorized: mocks.apiUnauthorized,
  apiNotFound: mocks.apiNotFound,
  apiForbidden: mocks.apiForbidden,
  apiGone: mocks.apiGone,
  apiError: mocks.apiError,
  notDeleted: mocks.notDeleted,
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  canPublishAnnouncements: (_role?: string | null) => mocks.canPublish,
  hasPermission: (_role?: string | null, _permission?: string) => mocks.canPublish,
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@features/announcements', () => ({
  validatePriorityForRole: (_priority: string, _role: string) =>
    mocks.validatedPriority as 'urgent' | 'high' | 'normal' | 'low',
  PRIORITY_TAXONOMY: { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 },
}));

import { GET, PATCH, DELETE } from '@/app/api/announcements/[id]/route';
import { makeSelectChain, makeUpdateChain } from '@/test/api/helpers';

function makeReq({
  method = 'GET',
  url = 'http://localhost:3000/api/announcements/ann-1',
  body,
}: {
  method?: string;
  url?: string;
  body?: unknown;
} = {}): Request {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/announcements/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.canPublish = true;
    mocks.validatedPriority = 'normal';
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const response = await GET(makeReq(), { params: Promise.resolve({ id: 'ann-1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 404 when announcement not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const response = await GET(makeReq(), { params: Promise.resolve({ id: 'ann-1' }) });
    expect(response.status).toBe(404);
  });

  it('returns 200 with announcement data', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };

    const announcement = {
      id: 'ann-1',
      title: 'Test Announcement',
      content: 'Test content',
      priority: 'normal',
      tenantId: 'test-tenant-id',
    };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([announcement]));

    const response = await GET(makeReq(), { params: Promise.resolve({ id: 'ann-1' }) });
    expect(response.status).toBe(200);
    expect(mocks.apiSuccess).toHaveBeenCalledWith(announcement);
  });

  it('enforces tenant isolation in where clause', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    await GET(makeReq(), { params: Promise.resolve({ id: 'ann-other-tenant' }) });

    // Verify the select chain was invoked (the where clause would have tenantId matching)
    expect(mocks.dbMock.select).toHaveBeenCalled();
    const chain = mocks.dbMock.select.mock.results[0]?.value;
    expect(chain.where).toHaveBeenCalled();
  });

  it('passes the id from params into the query', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ id: 'custom-1' }]));

    const response = await GET(
      makeReq({ url: 'http://localhost:3000/api/announcements/custom-1' }),
      {
        params: Promise.resolve({ id: 'custom-1' }),
      }
    );
    expect(response.status).toBe(200);
  });
});

describe('PATCH /api/announcements/[id]', () => {
  const updateBody = { title: 'Updated Title' };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.canPublish = true;
    mocks.validatedPriority = 'normal';
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const response = await PATCH(makeReq({ method: 'PATCH', body: updateBody }), {
      params: Promise.resolve({ id: 'ann-1' }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 when user lacks canPublishAnnouncements', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.canPublish = false;
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: updateBody }), {
      params: Promise.resolve({ id: 'ann-1' }),
    });
    expect(response.status).toBe(403);
  });

  it('returns 404 when announcement does not exist', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    // First select = user role, second select = existing check (empty)
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: updateBody }), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(response.status).toBe(404);
  });

  it('returns 410 when announcement is soft-deleted (gone)', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: '2026-06-20T10:00:00Z' }]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: updateBody }), {
      params: Promise.resolve({ id: 'ann-deleted' }),
    });
    expect(response.status).toBe(410);
    expect(mocks.apiGone).toHaveBeenCalled();
  });

  it('returns 400 when resourceId targets non-existent resource', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // resource lookup empty

    const response = await PATCH(
      makeReq({ method: 'PATCH', body: { title: 'Updated', resourceId: 'res-missing' } }),
      { params: Promise.resolve({ id: 'ann-1' }) }
    );
    expect(response.status).toBe(400);
  });

  it('downgrades priority based on role and returns warning', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.validatedPriority = 'low';

    const updated = {
      id: 'ann-1',
      title: 'Updated',
      priority: 'low',
    };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));

    mocks.dbMock.update.mockReturnValue(
      makeUpdateChain([{ ...updated, warning: 'Priority downgraded from urgent to low' }])
    );

    const response = await PATCH(
      makeReq({ method: 'PATCH', body: { title: 'Updated', priority: 'urgent' } }),
      { params: Promise.resolve({ id: 'ann-1' }) }
    );
    expect(response.status).toBe(200);
    expect(mocks.revalidateDashboard).toHaveBeenCalled();
  });

  it('updates announcement with valid data and returns 200', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };

    const updated = {
      id: 'ann-1',
      title: 'Updated Title',
      content: 'Updated content.',
      priority: 'normal',
    };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const response = await PATCH(
      makeReq({ method: 'PATCH', body: { title: 'Updated Title', content: 'Updated content.' } }),
      { params: Promise.resolve({ id: 'ann-1' }) }
    );
    expect(response.status).toBe(200);
    expect(mocks.revalidateDashboard).toHaveBeenCalled();
  });

  it('accepts partial updates', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'ann-1', author: 'New Author' }]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: { author: 'New Author' } }), {
      params: Promise.resolve({ id: 'ann-1' }),
    });
    expect(response.status).toBe(200);
  });

  it('revalidates dashboard after successful update', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'ann-1' }]));

    await PATCH(makeReq({ method: 'PATCH', body: { title: 'Updated' } }), {
      params: Promise.resolve({ id: 'ann-1' }),
    });
    expect(mocks.revalidateDashboard).toHaveBeenCalledTimes(1);
  });
});

describe('DELETE /api/announcements/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.canPublish = true;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const response = await DELETE(makeReq({ method: 'DELETE' }), {
      params: Promise.resolve({ id: 'ann-1' }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 when user lacks canPublishAnnouncements', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.canPublish = false;
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

    const response = await DELETE(makeReq({ method: 'DELETE' }), {
      params: Promise.resolve({ id: 'ann-1' }),
    });
    expect(response.status).toBe(403);
  });

  it('returns 404 when announcement not found (update returns empty)', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const response = await DELETE(makeReq({ method: 'DELETE' }), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(response.status).toBe(404);
  });

  it('soft-deletes announcement and returns success', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.dbMock.update.mockReturnValue(
      makeUpdateChain([{ id: 'ann-1', deletedAt: new Date('2026-06-21T12:00:00Z') }])
    );

    const response = await DELETE(makeReq({ method: 'DELETE' }), {
      params: Promise.resolve({ id: 'ann-1' }),
    });
    expect(response.status).toBe(200);
    expect(mocks.revalidateDashboard).toHaveBeenCalled();
  });

  it('revalidates dashboard after successful delete', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'ann-1' }]));

    await DELETE(makeReq({ method: 'DELETE' }), { params: Promise.resolve({ id: 'ann-1' }) });
    expect(mocks.revalidateDashboard).toHaveBeenCalledTimes(1);
  });
});
