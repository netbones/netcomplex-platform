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
    update: vi.fn(),
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
  apiNotFound: vi.fn(
    (message = 'Not found'): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message } }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
  ),
  revalidateContent: vi.fn(),
  snapshotContentVersion: vi.fn(),
  insertAuditLog: vi.fn(),
  nowFn: vi.fn(() => new Date('2026-06-23T12:00:00Z')),
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
    contentId: 'contentVersions.contentId',
    version: 'contentVersions.version',
    snapshot: 'contentVersions.snapshot',
  },
  contents: { id: 'contents.id', tenantId: 'contents.tenantId' },
  apiSuccess: mocks.apiSuccess,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiNotFound: mocks.apiNotFound,
  revalidateContent: mocks.revalidateContent,
  withErrorHandler: vi.fn((handler: any) => handler as never),
  now: ((...args: unknown[]) =>
    mocks.nowFn(...(args as Parameters<typeof mocks.nowFn>))) as typeof mocks.nowFn,
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@entities/content/server', () => ({
  snapshotContentVersion: (...args: any[]) => mocks.snapshotContentVersion(...args),
  insertAuditLog: (...args: any[]) => mocks.insertAuditLog(...args),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: any[]) => mocks.hasPermission(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { POST } from '@/app/api/content/[id]/versions/[versionId]/restore/route';
import { makeSelectChain, makeUpdateChain } from '@/test/api/helpers';

describe('POST /api/content/[id]/versions/[versionId]/restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.hasPermission.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores a version and returns 200', async () => {
    const versionRecord = {
      id: 'v-1',
      contentId: 'c-1',
      version: 1,
      snapshot: {
        title: { en: 'Original Title' },
        content: { en: 'Original body' },
        excerpt: { en: 'Original excerpt' },
      },
      createdAt: new Date('2026-06-21T12:00:00Z'),
    };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([versionRecord]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'c-1' }]));

    const response = await POST(
      new Request('http://localhost:3000/api/content/c-1/versions/v-1/restore', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
      }),
      { params: Promise.resolve({ id: 'c-1', versionId: 'v-1' }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({ restored: true, version: 1 });
    expect(mocks.snapshotContentVersion).toHaveBeenCalledWith(
      'c-1',
      'user-1',
      'Pre-restore snapshot'
    );
    expect(mocks.insertAuditLog).toHaveBeenCalledWith('c-1', 'RESTORED', 'user-1', {
      restoredFromVersion: 1,
      restoredFromVersionId: 'v-1',
    });
    expect(mocks.revalidateContent).toHaveBeenCalled();
  });

  it('returns 401 when user is not authenticated', async () => {
    mocks.sessionResult = null;

    const response = await POST(
      new Request('http://localhost:3000/api/content/c-1/versions/v-1/restore', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
      }),
      { params: Promise.resolve({ id: 'c-1', versionId: 'v-1' }) }
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 when user lacks content permission', async () => {
    mocks.hasPermission.mockReturnValue(false);
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

    const response = await POST(
      new Request('http://localhost:3000/api/content/c-1/versions/v-1/restore', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
      }),
      { params: Promise.resolve({ id: 'c-1', versionId: 'v-1' }) }
    );

    expect(response.status).toBe(403);
  });

  it('returns 404 when version does not exist', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const response = await POST(
      new Request('http://localhost:3000/api/content/c-1/versions/v-999/restore', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
      }),
      { params: Promise.resolve({ id: 'c-1', versionId: 'v-999' }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.apiNotFound).toHaveBeenCalledWith('Version not found');
  });
});
