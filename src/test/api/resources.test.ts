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
  sessionResult: null as { user: { id: string }; session: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  hasPermissionMock: vi.fn(),
}));

vi.mock('@api/server', () => {
  const jsonResponse = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  return {
    auth: {
      api: {
        getSession: () => Promise.resolve(mocks.sessionResult),
      },
    },
    db: mocks.dbMock,
    users: { id: 'id', role: 'role' },
    resources: {
      id: 'id',
      tenantId: 'tenantId',
      title: 'title',
      description: 'description',
      category: 'category',
      visibility: 'visibility',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      deletedAt: 'deletedAt',
      fileUrl: 'fileUrl',
      fileType: 'fileType',
      fileSize: 'fileSize',
      externalUrl: 'externalUrl',
      bodyContent: 'bodyContent',
      version: 'version',
      authorId: 'authorId',
      publishedAt: 'publishedAt',
    },
    households: { id: 'id', tenantId: 'tenantId' },
    profiles: { id: 'id', householdId: 'householdId', userId: 'userId' },
    apiSuccess: vi.fn((data: unknown) => jsonResponse({ success: true, data }, 200)),
    apiCreated: vi.fn((data: unknown) => jsonResponse({ success: true, data }, 201)),
    apiError: vi.fn((code: string, message: string, status: number = 500) =>
      jsonResponse({ success: false, error: { code, message } }, status)
    ),
    apiUnauthorized: vi.fn(() =>
      jsonResponse({ error: 'Unauthorized' }, 401)
    ),
    apiForbidden: vi.fn(() =>
      jsonResponse({ error: 'Forbidden' }, 403)
    ),
    withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
    now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
    revalidateContent: vi.fn(),
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: unknown[]) => mocks.hasPermissionMock(...args),
}));

import { GET, POST } from '@/app/api/resources/route';
import { makeSelectChain, makeInsertChain } from './helpers';

function makeUserSelect(role: string) {
  return makeSelectChain([{ role }]);
}

function makeOwnerSelect(found: boolean) {
  return makeSelectChain(found ? [{ id: 'h1' }] : []);
}

describe('Resources API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.hasPermissionMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns resources for authenticated admin user', async () => {
    mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
    mocks.hasPermissionMock.mockReturnValue(true);
    mocks.dbMock.select
      .mockReturnValueOnce(makeUserSelect('ADMIN'))
      .mockReturnValueOnce(makeOwnerSelect(true))
      .mockReturnValueOnce(
        makeSelectChain([
          { id: '1', title: 'Guide', category: 'GUIDE', visibility: 'ALL_RESIDENTS', description: 'User guide' },
          { id: '2', title: 'Form', category: 'FORM', visibility: 'OWNERS_ONLY', description: 'Registration form' },
        ])
      );

    const request = new Request('http://localhost:3000/api/resources');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].title).toBe('Guide');
  });

  it('returns empty array when no resources match', async () => {
    mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
    mocks.hasPermissionMock.mockReturnValue(true);
    mocks.dbMock.select
      .mockReturnValueOnce(makeUserSelect('ADMIN'))
      .mockReturnValueOnce(makeOwnerSelect(true))
      .mockReturnValueOnce(makeSelectChain([]));

    const request = new Request('http://localhost:3000/api/resources');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('returns 401 when POST is unauthenticated', async () => {
    const request = new Request('http://localhost:3000/api/resources', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Test', category: 'GUIDE' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('creates a resource via POST with content permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
    mocks.hasPermissionMock.mockReturnValue(true);
    mocks.dbMock.select
      .mockReturnValueOnce(makeUserSelect('MANAGER'));
    mocks.dbMock.insert
      .mockReturnValueOnce(
        makeInsertChain([{ id: 'new-1', title: 'New Doc', category: 'GUIDE' }])
      );

    const request = new Request('http://localhost:3000/api/resources', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'New Doc', category: 'GUIDE' }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.title).toBe('New Doc');
  });

  it('returns 403 when user lacks content permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeUserSelect('RESIDENT'));

    const request = new Request('http://localhost:3000/api/resources', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Test', category: 'GUIDE' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
    mocks.hasPermissionMock.mockReturnValue(true);
    mocks.dbMock.select
      .mockReturnValueOnce(makeUserSelect('MANAGER'));

    const request = new Request('http://localhost:3000/api/resources', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ category: 'GUIDE' }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
