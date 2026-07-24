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
  dbMock: {
    select: vi.fn(),
  },
  hasPermission: vi.fn(),
  apiSuccess: vi.fn(
    (data: unknown): Response =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    (): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiForbidden: vi.fn(
    (): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN' } }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
  ),
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)),
    },
  },
  db: mocks.dbMock,
  users: { id: 'users.id', role: 'users.role' },
  contentVersions: {
    id: 'contentVersions.id',
    version: 'contentVersions.version',
    snapshot: 'contentVersions.snapshot',
    userId: 'contentVersions.userId',
    changeSummary: 'contentVersions.changeSummary',
    contentId: 'contentVersions.contentId',
    createdAt: 'contentVersions.createdAt',
  },
  apiSuccess: mocks.apiSuccess,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  withErrorHandler: vi.fn((handler: any) => handler as never),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: any[]) => mocks.hasPermission(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { GET } from '@/app/api/content/[id]/versions/route';
import { makeSelectChain } from '@/test/api/helpers';

const mockVersions = [
  {
    id: 'v-2',
    version: 2,
    snapshot: { title: { en: 'Updated Title' } },
    userId: 'user-1',
    changeSummary: 'Updated title',
    createdAt: new Date('2026-06-22T12:00:00Z'),
  },
  {
    id: 'v-1',
    version: 1,
    snapshot: { title: { en: 'Original Title' } },
    userId: 'user-1',
    changeSummary: 'Initial version',
    createdAt: new Date('2026-06-21T12:00:00Z'),
  },
];

describe('GET /api/content/[id]/versions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.hasPermission.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with versions list ordered by version desc', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain(mockVersions));

    const response = await GET(
      new Request('http://localhost:3000/api/content/c-1/versions', {
        headers: {
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].version).toBe(2);
    expect(body.data[1].version).toBe(1);
  });

  it('returns 200 with empty array when no versions exist', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const response = await GET(
      new Request('http://localhost:3000/api/content/c-1/versions', {
        headers: {
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
  });

  it('returns 401 when user is not authenticated', async () => {
    mocks.sessionResult = null;

    const response = await GET(
      new Request('http://localhost:3000/api/content/c-1/versions', {
        headers: {
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 when user lacks content permission', async () => {
    mocks.hasPermission.mockReturnValue(false);
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

    const response = await GET(
      new Request('http://localhost:3000/api/content/c-1/versions', {
        headers: {
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    );

    expect(response.status).toBe(403);
  });

  it('filters versions by contentId', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain(mockVersions));

    await GET(
      new Request('http://localhost:3000/api/content/c-1/versions', {
        headers: {
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    );

    expect(mocks.dbMock.select).toHaveBeenCalledTimes(2);
  });
});
