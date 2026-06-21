import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  },
  apiSuccess: vi.fn((data: unknown) =>
    Response.json({ success: true, data }, { status: 200 })
  ),
  apiCreated: vi.fn((data: unknown) =>
    Response.json({ success: true, data }, { status: 201 })
  ),
  apiUnauthorized: vi.fn(() =>
    Response.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
      { status: 401 }
    )
  ),
  apiForbidden: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: message ?? 'Forbidden' },
      },
      { status: 403 }
    )
  ),
  hasPermission: vi.fn(),
}));

vi.mock('@api/server', () => ({
  CACHE_TAGS: { SETTINGS: 'settings' },
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  auth: { api: { getSession: () => Promise.resolve(mocks.sessionResult) } },
  db: mocks.dbMock,
  groups: {
    id: 'id', name: 'name', description: 'description', category: 'category',
    image: 'image', color: 'color', isPublic: 'isPublic', accessType: 'accessType',
    residentFilter: 'residentFilter', isActive: 'isActive', createdAt: 'createdAt',
    updatedAt: 'updatedAt', ownerId: 'ownerId', tenantId: 'tenantId',
  },
  users: { id: 'id', role: 'role', name: 'name' },
  groupMembers: { id: 'id', userId: 'userId', groupId: 'groupId', role: 'role', joinedAt: 'joinedAt', tenantId: 'tenantId' },
  apiSuccess: mocks.apiSuccess,
  apiCreated: mocks.apiCreated,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiError: vi.fn(),
  notDeleted: vi.fn((t: { deletedAt: string }) => ({ isNull: [t, 'deletedAt'] })),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return { ...actual, hasPermission: mocks.hasPermission, apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } };
});

import { GET, POST } from '@/app/api/groups/route';
import { makeSelectChain, makeInsertChain } from './helpers';

const mockSession = (role: string) => {
  mocks.sessionResult = { user: { id: 'user-1' } };
  mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role }]));
};

const mockPermission = (perms: Record<string, boolean>) => {
  mocks.hasPermission.mockImplementation((_role: string | null | undefined, perm: string) =>
    perms[perm] === true
  );
};

describe('GET /api/groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));
    mocks.hasPermission.mockReturnValue(false);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await GET(new Request('http://localhost:3000/api/groups') as any);
    expect(res.status).toBe(401);
  });

  it('returns 403 when role lacks permission and is not RESIDENT', async () => {
    mockSession('AGENT');
    mockPermission({});
    const res = await GET(new Request('http://localhost:3000/api/groups') as any);
    expect(res.status).toBe(403);
  });

  it('returns group list for authorized user', async () => {
    mockSession('ADMIN');
    mockPermission({ groups: true });

    mocks.dbMock.select.mockReturnValueOnce(
      makeSelectChain([
        { id: 'g-1', name: 'Book Club', ownerId: 'u-1', isActive: true, description: null, category: null, image: null, color: '#4F46E5', isPublic: true, accessType: 'OPEN', residentFilter: 'ALL', createdAt: null, updatedAt: null, ownerName: 'Alice' },
      ])
    );

    const res = await GET(new Request('http://localhost:3000/api/groups') as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Book Club');
  });

  it('allows RESIDENT without explicit groups permission', async () => {
    mockSession('RESIDENT');
    mockPermission({});
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));
    const res = await GET(new Request('http://localhost:3000/api/groups') as any);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));
    mocks.hasPermission.mockReturnValue(false);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Group', description: 'Test', category: 'SOCIAL' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('creates a group for ADMIN with groups permission', async () => {
    mockSession('ADMIN');
    mockPermission({ groups: true });

    const created = { id: 'g-new', tenantId: 'test-tenant-id', name: 'New Group', description: 'Test', category: 'SOCIAL', image: null, isPublic: true, ownerId: 'user-1', color: '#4F46E5', accessType: 'OPEN', residentFilter: 'ALL', isActive: true };
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([created]));

    const res = await POST(
      new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Group', description: 'Test', category: 'SOCIAL' }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('New Group');
    expect(body.data.color).toBe('#4F46E5');
    expect(body.data.accessType).toBe('OPEN');
  });
});
