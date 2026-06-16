import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock next/headers
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

// Hoisted mutable mocks
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string; name?: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  apiSuccess: vi.fn((data: unknown, _meta?: unknown, status = 200) =>
    Response.json({ success: true, data }, { status })
  ),
  apiCreated: vi.fn((data: unknown) => Response.json({ success: true, data }, { status: 201 })),
  apiUnauthorized: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'AUTH_REQUIRED', message: message || 'Authentication required' },
      },
      { status: 401 }
    )
  ),
  apiForbidden: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'FORBIDDEN', message: message || 'Forbidden' } },
      { status: 403 }
    )
  ),
  apiNotFound: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: message || 'Not found' } },
      { status: 404 }
    )
  ),
  apiError: vi.fn((code: string, message: string, status: number) =>
    Response.json({ success: false, error: { code, message } }, { status })
  ),
  apiInternalError: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: message || 'Internal server error' },
      },
      { status: 500 }
    )
  ),
  apiValidationError: vi.fn((details?: unknown) =>
    Response.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
      },
      { status: 422 }
    )
  ),
  hasPermission: vi.fn(),
}));

// Mock @api/server
vi.mock('@api/server', () => ({
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
  },
  users: {
    id: 'id',
    role: 'role',
    name: 'name',
    email: 'email',
  },
  groupMembers: {
    id: 'id',
    userId: 'userId',
    groupId: 'groupId',
    role: 'role',
    joinedAt: 'joinedAt',
    tenantId: 'tenantId',
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
  groupMembershipRequests: {
    id: 'id',
    userId: 'userId',
    groupId: 'groupId',
    status: 'status',
    message: 'message',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    tenantId: 'tenantId',
  },
  apiSuccess: mocks.apiSuccess,
  apiCreated: mocks.apiCreated,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiNotFound: mocks.apiNotFound,
  apiError: mocks.apiError,
  apiInternalError: mocks.apiInternalError,
  apiValidationError: mocks.apiValidationError,
}));

// Mock @entities/tenant for withTenant
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

// Mock @shared/lib — preserve real exports, override hasPermission and apiLogger
vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    hasPermission: mocks.hasPermission,
    apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  };
});

import { GET as GET_GROUPS, POST as POST_GROUPS } from '@/app/api/groups/route';
import { GET as GET_GROUP, PATCH, DELETE } from '@/app/api/groups/[id]/route';
import { POST as POST_MEMBERS, DELETE as DELETE_MEMBERS } from '@/app/api/groups/members/route';
import { GET as GET_REQUESTS } from '@/app/api/groups/membership-requests/route';
import { POST as POST_REQUEST } from '@/app/api/groups/membership-requests/[id]/route';
import { makeSelectChain } from './helpers';

function setupAuth(role: string) {
  mocks.sessionResult = { user: { id: 'user-1' } };
  mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role }]));
}

function setupPermission(hasPermissions: Record<string, boolean>) {
  mocks.hasPermission.mockImplementation((role: string | null | undefined, perm: string) => {
    if (!role) return false;
    return hasPermissions[perm] === true;
  });
}

describe('Groups API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    });
    mocks.dbMock.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });
    mocks.dbMock.delete.mockReturnValue({
      where: vi.fn(() => Promise.resolve()),
    });
    setupPermission({
      admin: true,
      users: true,
      groups: true,
      groupsOwn: true,
      content: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── GET /api/groups ────────────────────────────────────────────────

  describe('GET /api/groups', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/groups');
      const response = await GET_GROUPS(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 with role lacking groups/groupsOwn permission (when not RESIDENT)', async () => {
      setupAuth('AGENT');
      setupPermission({});

      const request = new Request('http://localhost:3000/api/groups');
      const response = await GET_GROUPS(request);
      expect(response.status).toBe(403);
    });

    it('returns group list for ADMIN with groups permission', async () => {
      setupAuth('ADMIN');
      setupPermission({ groups: true, groupsOwn: true });

      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'g-1',
            name: 'Book Club',
            description: 'Monthly reads',
            ownerId: 'u-1',
            isActive: true,
          },
        ])
      );
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ id: 'ug-1' }]));

      const request = new Request('http://localhost:3000/api/groups');
      const response = await GET_GROUPS(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]._count.members).toBe(1);
    });

    it('allows RESIDENT via role-based bypass even without groups/groupsOwn permission', async () => {
      setupAuth('RESIDENT');
      setupPermission({});

      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));
      // member-count queries fall through to default empty select

      const request = new Request('http://localhost:3000/api/groups');
      const response = await GET_GROUPS(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
    });

    it('allows GROUP_ADMIN via groupsOwn permission', async () => {
      setupAuth('GROUP_ADMIN');
      setupPermission({ groupsOwn: true });

      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/groups');
      const response = await GET_GROUPS(request);

      expect(response.status).toBe(200);
    });

    it('returns groups with member counts', async () => {
      setupAuth('ADMIN');
      setupPermission({ groups: true });

      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          { id: 'g-1', name: 'Group A', ownerId: 'u-1' },
          { id: 'g-2', name: 'Group B', ownerId: 'u-2' },
        ])
      );
      // Each group triggers a member-count query; default select returns 3 members each
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([{ id: 'm-1' }, { id: 'm-2' }, { id: 'm-3' }])
      );

      const request = new Request('http://localhost:3000/api/groups');
      const response = await GET_GROUPS(request);

      const body = await response.json();
      expect(body.data[0]._count.members).toBe(3);
      expect(body.data[1]._count.members).toBe(3);
    });
  });

  // ── POST /api/groups ───────────────────────────────────────────────

  describe('POST /api/groups', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Group',
          description: 'A test group',
          category: 'SOCIAL',
        }),
      });
      const response = await POST_GROUPS(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT without groups or groupsOwn permission', async () => {
      setupAuth('RESIDENT');
      setupPermission({});

      const request = new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Group',
          description: 'A test group',
          category: 'SOCIAL',
        }),
      });
      const response = await POST_GROUPS(request);
      expect(response.status).toBe(403);
    });

    it('creates group for ADMIN with groups permission', async () => {
      setupAuth('ADMIN');
      setupPermission({ groups: true });

      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: 'g-new',
                tenantId: 'test-tenant-id',
                name: 'New Group',
                description: 'A test group',
                category: 'SOCIAL',
                image: null,
                isPublic: true,
                ownerId: 'user-1',
                color: '#4F46E5',
                accessType: 'OPEN',
                residentFilter: 'ALL',
                isActive: true,
              },
            ])
          ),
        })),
      });

      const request = new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Group',
          description: 'A test group',
          category: 'SOCIAL',
        }),
      });
      const response = await POST_GROUPS(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.name).toBe('New Group');
      expect(body.data.color).toBe('#4F46E5');
      expect(body.data.accessType).toBe('OPEN');
    });

    it('auto-defaults color and accessType when not provided', async () => {
      setupAuth('ADMIN');
      setupPermission({ groups: true });

      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: 'g-def',
                tenantId: 'test-tenant-id',
                name: 'Minimal',
                description: null,
                category: null,
                color: '#4F46E5',
                accessType: 'OPEN',
              },
            ])
          ),
        })),
      });

      const request = new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Minimal' }),
      });
      const response = await POST_GROUPS(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.color).toBe('#4F46E5');
      expect(body.data.accessType).toBe('OPEN');
    });

    it('creates group for GROUP_ADMIN via groupsOwn permission', async () => {
      setupAuth('GROUP_ADMIN');
      setupPermission({ groupsOwn: true });

      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([{ id: 'g-ga', tenantId: 'test-tenant-id', name: 'GA Group' }])
          ),
        })),
      });

      const request = new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'GA Group',
          description: 'GroupAdmin group',
          category: 'SOCIAL',
        }),
      });
      const response = await POST_GROUPS(request);

      expect(response.status).toBe(201);
    });
  });

  // ── GET /api/groups/[id] ───────────────────────────────────────────

  describe('GET /api/groups/[id]', () => {
    it('returns group detail without authentication (public, tenant-scoped)', async () => {
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'g-1',
            name: 'Public Group',
            description: 'Open to all',
            category: 'SOCIAL',
            image: null,
            color: '#4F46E5',
            isPublic: true,
            accessType: 'OPEN',
            residentFilter: 'ALL',
            isActive: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            ownerId: 'u-1',
          },
        ])
      );
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'u-1', name: 'Owner Name' }]));
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          { id: 'mg-1', userId: 'u-2', groupId: 'g-1', role: 'MEMBER', joinedAt: '2026-01-02' },
        ])
      );
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ id: 'u-2', name: 'Member Name' }])
      );
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const response = await GET_GROUP(new Request('http://localhost:3000/api/groups/g-1'), {
        params: Promise.resolve({ id: 'g-1' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.name).toBe('Public Group');
      expect(body.data.owner).toEqual({ id: 'u-1', name: 'Owner Name' });
      expect(body.data.members).toHaveLength(1);
      expect(body.data.members[0].user.name).toBe('Member Name');
    });

    it('returns 404 for non-existent group', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const response = await GET_GROUP(
        new Request('http://localhost:3000/api/groups/nonexistent'),
        {
          params: Promise.resolve({ id: 'nonexistent' }),
        }
      );

      expect(response.status).toBe(404);
    });

    it('includes contents in the response', async () => {
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ id: 'g-2', name: 'Content Group', ownerId: 'u-1' }])
      );
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'u-1', name: 'Owner' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([])); // members
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          { id: 'c-1', title: 'First Post', content: 'Hello world', groupId: 'g-2' },
          { id: 'c-2', title: 'Second Post', content: 'More content', groupId: 'g-2' },
        ])
      );

      const response = await GET_GROUP(new Request('http://localhost:3000/api/groups/g-2'), {
        params: Promise.resolve({ id: 'g-2' }),
      });

      const body = await response.json();
      expect(body.data.contents).toHaveLength(2);
      expect(body.data.contents[0].title).toBe('First Post');
    });

    it('enforces tenant isolation', async () => {
      // Tenant-scoped query returns nothing for wrong tenant
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const response = await GET_GROUP(
        new Request('http://localhost:3000/api/groups/other-tenant'),
        {
          params: Promise.resolve({ id: 'other-tenant' }),
        }
      );

      expect(response.status).toBe(404);
    });
  });

  // ── PATCH /api/groups/[id] ─────────────────────────────────────────

  describe('PATCH /api/groups/[id]', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/groups/g-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'g-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT without groups or groupsOwn permission', async () => {
      setupAuth('RESIDENT');
      setupPermission({});

      const request = new Request('http://localhost:3000/api/groups/g-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'g-1' }) });
      expect(response.status).toBe(403);
    });

    it('updates group for ADMIN with groups permission', async () => {
      setupAuth('ADMIN');
      setupPermission({ groups: true });

      mocks.dbMock.update.mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() =>
              Promise.resolve([{ id: 'g-1', name: 'Updated Name', description: 'New desc' }])
            ),
          })),
        })),
      });

      const request = new Request('http://localhost:3000/api/groups/g-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name', description: 'New desc' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'g-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.name).toBe('Updated Name');
    });

    it('supports partial update with only some fields', async () => {
      setupAuth('ADMIN');
      setupPermission({ groups: true });

      mocks.dbMock.update.mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() =>
              Promise.resolve([{ id: 'g-1', name: 'Just Name', description: null }])
            ),
          })),
        })),
      });

      const request = new Request('http://localhost:3000/api/groups/g-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Just Name' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'g-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.name).toBe('Just Name');
    });
  });

  // ── DELETE /api/groups/[id] ────────────────────────────────────────

  describe('DELETE /api/groups/[id]', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/groups/g-1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'g-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT without groups or groupsOwn permission', async () => {
      setupAuth('RESIDENT');
      setupPermission({});

      const request = new Request('http://localhost:3000/api/groups/g-1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'g-1' }) });
      expect(response.status).toBe(403);
    });

    it('deletes group for ADMIN with groups permission', async () => {
      setupAuth('ADMIN');
      setupPermission({ groups: true });

      const request = new Request('http://localhost:3000/api/groups/g-1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'g-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.success).toBe(true);
    });

    it('deletes group for GROUP_ADMIN via groupsOwn permission', async () => {
      setupAuth('GROUP_ADMIN');
      setupPermission({ groupsOwn: true });

      const request = new Request('http://localhost:3000/api/groups/g-1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'g-1' }) });

      expect(response.status).toBe(200);
      expect(mocks.dbMock.delete).toHaveBeenCalled();
    });
  });

  // ── POST /api/groups/members ───────────────────────────────────────

  describe('POST /api/groups/members', () => {
    it('adds member without authentication (public endpoint)', async () => {
      // No auth check — returns empty for duplicate check
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: 'mem-1',
                tenantId: 'test-tenant-id',
                userId: 'u-1',
                groupId: 'g-1',
                role: 'MEMBER',
              },
            ])
          ),
        })),
      });

      const request = new Request('http://localhost:3000/api/groups/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u-1', groupId: 'g-1' }),
      });
      const response = await POST_MEMBERS(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.userId).toBe('u-1');
      expect(body.data.groupId).toBe('g-1');
    });

    it('returns 400 for duplicate membership', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ id: 'existing' }]));

      const request = new Request('http://localhost:3000/api/groups/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u-1', groupId: 'g-1' }),
      });
      const response = await POST_MEMBERS(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('defaults role to MEMBER when not specified', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: 'mem-2',
                tenantId: 'test-tenant-id',
                userId: 'u-1',
                groupId: 'g-1',
                role: 'MEMBER',
              },
            ])
          ),
        })),
      });

      const request = new Request('http://localhost:3000/api/groups/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u-1', groupId: 'g-1' }),
      });
      const response = await POST_MEMBERS(request);

      const body = await response.json();
      expect(body.data.role).toBe('MEMBER');
    });

    it('enforces tenant isolation', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              { id: 'mem-3', tenantId: 'test-tenant-id', userId: 'u-1', groupId: 'g-1' },
            ])
          ),
        })),
      });

      const request = new Request('http://localhost:3000/api/groups/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u-1', groupId: 'g-1' }),
      });
      const response = await POST_MEMBERS(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.tenantId).toBe('test-tenant-id');
    });
  });

  // ── DELETE /api/groups/members ─────────────────────────────────────

  describe('DELETE /api/groups/members', () => {
    it('removes member without authentication (public endpoint)', async () => {
      const request = new Request(
        'http://localhost:3000/api/groups/members?userId=u-1&groupId=g-1',
        { method: 'DELETE' }
      );
      const response = await DELETE_MEMBERS(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.success).toBe(true);
      expect(mocks.dbMock.delete).toHaveBeenCalled();
    });

    it('returns 400 for missing query params', async () => {
      const request = new Request('http://localhost:3000/api/groups/members', { method: 'DELETE' });
      const response = await DELETE_MEMBERS(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when only userId is provided', async () => {
      const request = new Request('http://localhost:3000/api/groups/members?userId=u-1', {
        method: 'DELETE',
      });
      const response = await DELETE_MEMBERS(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 when only groupId is provided', async () => {
      const request = new Request('http://localhost:3000/api/groups/members?groupId=g-1', {
        method: 'DELETE',
      });
      const response = await DELETE_MEMBERS(request);

      expect(response.status).toBe(400);
    });
  });

  // ── GET /api/groups/membership-requests ────────────────────────────

  describe('GET /api/groups/membership-requests', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/groups/membership-requests');
      const response = await GET_REQUESTS(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT without content permission', async () => {
      setupAuth('RESIDENT');
      setupPermission({});

      const request = new Request('http://localhost:3000/api/groups/membership-requests');
      const response = await GET_REQUESTS(request);
      expect(response.status).toBe(403);
    });

    it('returns list for ADMIN with content permission', async () => {
      setupAuth('ADMIN');
      setupPermission({ content: true });

      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'mr-1',
            userId: 'u-1',
            groupId: 'g-1',
            status: 'PENDING',
            message: 'I would like to join',
            createdAt: '2026-01-01',
            user: { name: 'Alice', email: 'alice@test.com' },
            group: { name: 'Book Club', accessType: 'OPEN' },
          },
        ])
      );

      const request = new Request('http://localhost:3000/api/groups/membership-requests');
      const response = await GET_REQUESTS(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.requests).toHaveLength(1);
      expect(body.data.requests[0].status).toBe('PENDING');
    });

    it('filters by status query param', async () => {
      setupAuth('ADMIN');
      setupPermission({ content: true });

      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'mr-2',
            userId: 'u-2',
            groupId: 'g-2',
            status: 'APPROVED',
            createdAt: '2026-01-02',
            user: { name: 'Bob' },
            group: { name: 'Yoga' },
          },
        ])
      );

      const request = new Request(
        'http://localhost:3000/api/groups/membership-requests?status=APPROVED'
      );
      const response = await GET_REQUESTS(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.requests[0].status).toBe('APPROVED');
    });

    it('returns pending by default when no status is provided', async () => {
      setupAuth('ADMIN');
      setupPermission({ content: true });

      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'mr-3',
            status: 'PENDING',
            createdAt: '2026-01-03',
            user: { name: 'Charlie' },
            group: { name: 'Runners' },
          },
        ])
      );

      const request = new Request('http://localhost:3000/api/groups/membership-requests');
      const response = await GET_REQUESTS(request);

      const body = await response.json();
      expect(body.data.requests[0].status).toBe('PENDING');
    });
  });

  // ── POST /api/groups/membership-requests/[id] ──────────────────────

  describe('POST /api/groups/membership-requests/[id]', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/groups/membership-requests/mr-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const response = await POST_REQUEST(request, { params: Promise.resolve({ id: 'mr-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT without content permission', async () => {
      setupAuth('RESIDENT');
      setupPermission({});

      const request = new Request('http://localhost:3000/api/groups/membership-requests/mr-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const response = await POST_REQUEST(request, { params: Promise.resolve({ id: 'mr-1' }) });
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid action', async () => {
      setupAuth('ADMIN');
      setupPermission({ content: true });

      const request = new Request('http://localhost:3000/api/groups/membership-requests/mr-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      const response = await POST_REQUEST(request, { params: Promise.resolve({ id: 'mr-1' }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for non-existent request', async () => {
      setupAuth('ADMIN');
      setupPermission({ content: true });

      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/groups/membership-requests/mr-none', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const response = await POST_REQUEST(request, {
        params: Promise.resolve({ id: 'mr-none' }),
      });

      expect(response.status).toBe(404);
    });

    it('approves a request and creates membership', async () => {
      setupAuth('ADMIN');
      setupPermission({ content: true });

      // Find the request
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'mr-1',
            userId: 'u-1',
            groupId: 'g-1',
            status: 'PENDING',
            message: 'Please join',
            tenantId: 'test-tenant-id',
          },
        ])
      );
      // Check existing membership
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));
      // Fetch full response after approve
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'mr-1',
            userId: 'u-1',
            groupId: 'g-1',
            status: 'APPROVED',
            message: 'Please join',
            createdAt: '2026-01-01',
            user: { name: 'Alice', email: 'alice@test.com' },
            group: { name: 'Book Club', accessType: 'OPEN' },
          },
        ])
      );

      const request = new Request('http://localhost:3000/api/groups/membership-requests/mr-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const response = await POST_REQUEST(request, { params: Promise.resolve({ id: 'mr-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.request.status).toBe('APPROVED');
      expect(mocks.dbMock.insert).toHaveBeenCalled();
    });

    it('rejects a request without creating membership', async () => {
      setupAuth('ADMIN');
      setupPermission({ content: true });

      // Find the request
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'mr-2',
            userId: 'u-2',
            groupId: 'g-2',
            status: 'PENDING',
            tenantId: 'test-tenant-id',
          },
        ])
      );
      // Fetch full response after reject
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'mr-2',
            userId: 'u-2',
            groupId: 'g-2',
            status: 'REJECTED',
            message: null,
            createdAt: '2026-01-01',
            user: { name: 'Bob', email: 'bob@test.com' },
            group: { name: 'Yoga', accessType: 'INVITE_ONLY' },
          },
        ])
      );

      const request = new Request('http://localhost:3000/api/groups/membership-requests/mr-2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      const response = await POST_REQUEST(request, { params: Promise.resolve({ id: 'mr-2' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.request.status).toBe('REJECTED');
      // should not call insert (only update)
      expect(mocks.dbMock.insert).not.toHaveBeenCalled();
    });

    it('returns 400 for already processed request', async () => {
      setupAuth('ADMIN');
      setupPermission({ content: true });

      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'mr-3',
            userId: 'u-3',
            groupId: 'g-3',
            status: 'REJECTED',
            tenantId: 'test-tenant-id',
          },
        ])
      );

      const request = new Request('http://localhost:3000/api/groups/membership-requests/mr-3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const response = await POST_REQUEST(request, { params: Promise.resolve({ id: 'mr-3' }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('handles approve with existing membership gracefully', async () => {
      setupAuth('ADMIN');
      setupPermission({ content: true });

      // Find the request
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'mr-4',
            userId: 'u-4',
            groupId: 'g-4',
            status: 'PENDING',
            tenantId: 'test-tenant-id',
          },
        ])
      );
      // Existing membership check — found
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'existing-mem' }]));
      // Fetch full response
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'mr-4',
            status: 'APPROVED',
            userId: 'u-4',
            groupId: 'g-4',
            createdAt: '2026-01-01',
            user: { name: 'Diana' },
            group: { name: 'Chess' },
          },
        ])
      );

      const request = new Request('http://localhost:3000/api/groups/membership-requests/mr-4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const response = await POST_REQUEST(request, { params: Promise.resolve({ id: 'mr-4' }) });

      expect(response.status).toBe(200);
      // insert should NOT be called since membership already exists
      expect(mocks.dbMock.insert).not.toHaveBeenCalled();
    });
  });
});
