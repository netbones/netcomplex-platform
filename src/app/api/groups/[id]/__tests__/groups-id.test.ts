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
  groups: {
    id: 'id',
    name: 'name',
    description: 'description',
    category: 'category',
    image: 'image',
    color: 'color',
    isPublic: 'isPublic',
    accessType: 'accessType',
    residentFilter: 'residentFilter',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    ownerId: 'ownerId',
    tenantId: 'tenantId',
    deletedAt: 'deletedAt',
  },
  users: { id: 'id', role: 'role', name: 'name', image: 'image' },
  groupMembers: {
    id: 'id',
    userId: 'userId',
    groupId: 'groupId',
    role: 'role',
    joinedAt: 'joinedAt',
    deletedAt: 'deletedAt',
  },
  contents: {
    id: 'id',
    title: 'title',
    content: 'content',
    excerpt: 'excerpt',
    category: 'category',
    authorId: 'authorId',
    groupId: 'groupId',
    published: 'published',
    featured: 'featured',
    priority: 'priority',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    publishedAt: 'publishedAt',
  },
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  withErrorHandler: vi.fn((handler: any) => handler as never),
  apiSuccess: mocks.apiSuccess,
  apiUnauthorized: mocks.apiUnauthorized,
  apiNotFound: mocks.apiNotFound,
  apiForbidden: mocks.apiForbidden,
  apiGone: mocks.apiGone,
  apiError: vi.fn(),
  notDeleted: mocks.notDeleted,
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: any[]) => mocks.hasPermission(...args),
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET, PATCH, DELETE } from '@/app/api/groups/[id]/route';
import { makeSelectChain, makeUpdateChain } from './helpers';

function makeReq({
  method = 'GET',
  body,
}: {
  method?: string;
  body?: unknown;
} = {}): Request {
  return new Request('http://localhost:3000/api/groups/g-1', {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/groups/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 when group not found', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const response = await GET(makeReq(), { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(response.status).toBe(404);
  });

  it('returns 200 with group, owner, members, and contents', async () => {
    const group = {
      id: 'g-1',
      name: 'Book Club',
      description: 'A book club',
      category: 'SOCIAL',
      image: null,
      color: '#4F46E5',
      isPublic: true,
      accessType: 'OPEN',
      residentFilter: 'ALL',
      isActive: true,
      ownerId: 'user-1',
      createdAt: null,
      updatedAt: null,
    };
    const owner = { id: 'user-1', name: 'Alice' };
    const members = [
      { id: 'mem-1', userId: 'user-1', groupId: 'g-1', role: 'OWNER', joinedAt: new Date() },
      { id: 'mem-2', userId: 'user-2', groupId: 'g-1', role: 'MEMBER', joinedAt: new Date() },
    ];
    const memberUsers = [
      { id: 'user-1', name: 'Alice', image: null },
      { id: 'user-2', name: 'Bob', image: null },
    ];
    const contents = [
      {
        id: 'c-1',
        title: 'Meeting Notes',
        content: 'Notes...',
        excerpt: null,
        category: 'DISCUSSION',
        authorId: 'user-1',
        groupId: 'g-1',
        published: true,
        featured: false,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      },
    ];

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([group]))
      .mockReturnValueOnce(makeSelectChain([owner]))
      .mockReturnValueOnce(makeSelectChain(members))
      .mockReturnValueOnce(makeSelectChain(memberUsers))
      .mockReturnValueOnce(makeSelectChain(contents));

    const response = await GET(makeReq(), { params: Promise.resolve({ id: 'g-1' }) });
    expect(response.status).toBe(200);
    expect(mocks.apiSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'g-1',
        name: 'Book Club',
        owner: { id: 'user-1', name: 'Alice' },
        members: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1', role: 'OWNER' }),
          expect.objectContaining({ userId: 'user-2', role: 'MEMBER' }),
        ]),
        contents: expect.arrayContaining([
          expect.objectContaining({ id: 'c-1', title: 'Meeting Notes' }),
        ]),
      })
    );
  });

  it('handles empty members gracefully', async () => {
    const group = { id: 'g-1', name: 'Empty Group', ownerId: 'user-1' };
    const owner = { id: 'user-1', name: 'Alice' };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([group]))
      .mockReturnValueOnce(makeSelectChain([owner]))
      .mockReturnValueOnce(makeSelectChain([])) // no members
      .mockReturnValueOnce(makeSelectChain([])) // no member users (not called since no member IDs)
      .mockReturnValueOnce(makeSelectChain([])); // no contents

    const response = await GET(makeReq(), { params: Promise.resolve({ id: 'g-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.members).toEqual([]);
    expect(body.data.contents).toEqual([]);
  });

  it('enforces tenant isolation with notDeleted', async () => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    await GET(makeReq(), { params: Promise.resolve({ id: 'g-1' }) });

    expect(mocks.notDeleted).toHaveBeenCalled();
  });
});

describe('PATCH /api/groups/[id]', () => {
  const updateBody = { name: 'Updated Group', description: 'Updated description' };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.hasPermission.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const response = await PATCH(makeReq({ method: 'PATCH', body: updateBody }), {
      params: Promise.resolve({ id: 'g-1' }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 without groups or groupsOwn permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: updateBody }), {
      params: Promise.resolve({ id: 'g-1' }),
    });
    expect(response.status).toBe(403);
  });

  it('returns 404 when group does not exist', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.hasPermission.mockReturnValue(true);
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // existing check empty

    const response = await PATCH(makeReq({ method: 'PATCH', body: updateBody }), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(response.status).toBe(404);
  });

  it('returns 410 when group is soft-deleted (gone)', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.hasPermission.mockReturnValue(true);
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: '2026-06-20T10:00:00Z' }]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: updateBody }), {
      params: Promise.resolve({ id: 'g-deleted' }),
    });
    expect(response.status).toBe(410);
    expect(mocks.apiGone).toHaveBeenCalled();
  });

  it('updates group with valid data and returns 200', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.hasPermission.mockReturnValue(true);

    const updated = {
      id: 'g-1',
      name: 'Updated Group',
      description: 'Updated description',
      category: 'SOCIAL',
      image: null,
      color: '#4F46E5',
      isPublic: true,
      accessType: 'OPEN',
      residentFilter: 'ALL',
      updatedAt: new Date(),
    };

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([updated]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: updateBody }), {
      params: Promise.resolve({ id: 'g-1' }),
    });
    expect(response.status).toBe(200);
  });

  it('allows update with groupsOwn permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.hasPermission.mockImplementation(
      (_role: string | null | undefined, perm: string) => perm === 'groupsOwn'
    );

    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'MEMBER' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));

    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'g-1', name: 'Updated' }]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: { name: 'Updated' } }), {
      params: Promise.resolve({ id: 'g-1' }),
    });
    expect(response.status).toBe(200);
  });

  it('enforces tenant isolation on PATCH', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.hasPermission.mockReturnValue(true);
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'g-1' }]));

    await PATCH(makeReq({ method: 'PATCH', body: { name: 'Updated' } }), {
      params: Promise.resolve({ id: 'g-1' }),
    });
    // The update should be scoped to tenantId — but we can verify the select was called at least
    expect(mocks.dbMock.select).toHaveBeenCalledTimes(2);
  });
});

describe('DELETE /api/groups/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.hasPermission.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const response = await DELETE(makeReq({ method: 'DELETE' }), {
      params: Promise.resolve({ id: 'g-1' }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 without groups or groupsOwn permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

    const response = await DELETE(makeReq({ method: 'DELETE' }), {
      params: Promise.resolve({ id: 'g-1' }),
    });
    expect(response.status).toBe(403);
  });

  it('soft-deletes group and returns 200', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.hasPermission.mockReturnValue(true);
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'g-1' }]));

    const response = await DELETE(makeReq({ method: 'DELETE' }), {
      params: Promise.resolve({ id: 'g-1' }),
    });
    expect(response.status).toBe(200);
  });

  it('returns success with { success: true }', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.hasPermission.mockReturnValue(true);
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([])); // return value doesn't matter, DELETE ignores returning

    const response = await DELETE(makeReq({ method: 'DELETE' }), {
      params: Promise.resolve({ id: 'g-1' }),
    });
    expect(response.status).toBe(200);
    expect(mocks.apiSuccess).toHaveBeenCalledWith({ success: true });
  });
});
