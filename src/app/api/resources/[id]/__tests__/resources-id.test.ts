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
  mockRole: 'ADMIN' as string | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  },
  hasPermissionMock: vi.fn(),
  revalidateContent: vi.fn(),
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
    getSessionAndRole: vi.fn(() => {
      if (!mocks.sessionResult) return Promise.resolve(null);
      return Promise.resolve({
        session: {
          user: { id: mocks.sessionResult.user.id, email: 'test@test.com', name: 'Test' },
        },
        userId: mocks.sessionResult.user.id,
        role: mocks.mockRole,
        suspension: null,
      });
    }),
    guardSuspension: vi.fn(() => null),
    CACHE_TAGS: {},
    notDeleted: vi.fn(() => true),
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
    resourceVersions: {
      id: 'id',
      resourceId: 'resourceId',
      fileUrl: 'fileUrl',
      fileType: 'fileType',
      fileSize: 'fileSize',
      version: 'version',
      notes: 'notes',
      createdAt: 'createdAt',
    },
    households: { id: 'id', tenantId: 'tenantId' },
    profiles: { id: 'id', householdId: 'householdId', userId: 'userId' },
    apiSuccess: vi.fn((data: unknown) => jsonResponse({ success: true, data }, 200)),
    apiError: vi.fn((code: string, message: string, status: number = 500) =>
      jsonResponse({ success: false, error: { code, message } }, status)
    ),
    apiUnauthorized: vi.fn(() => jsonResponse({ error: 'Unauthorized' }, 401)),
    apiForbidden: vi.fn(() => jsonResponse({ error: 'Forbidden' }, 403)),
    apiNotFound: vi.fn((message?: string) => jsonResponse({ error: message || 'Not Found' }, 404)),
    apiGone: vi.fn((message?: string) => jsonResponse({ error: message || 'Gone' }, 410)),
    withErrorHandler: vi.fn(
      (handler: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>) =>
        handler as never
    ),
    now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
    revalidateContent: mocks.revalidateContent,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: unknown[]) => mocks.hasPermissionMock(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { GET, PATCH, DELETE } from '@/app/api/resources/[id]/route';
import { makeSelectChain, makeUpdateChain } from '@/test/api/helpers';

function makeUserSelect(role: string) {
  return makeSelectChain([{ role }]);
}

function makeOwnerSelect(found: boolean) {
  return makeSelectChain(found ? [{ id: 'h1' }] : []);
}

const RESOURCE = {
  id: 'resource-1',
  tenantId: 'test-tenant-id',
  title: 'Community Guide',
  description: 'Welcome guide',
  category: 'GUIDE',
  visibility: 'ALL_RESIDENTS',
  fileUrl: null,
  fileType: null,
  fileSize: null,
  externalUrl: null,
  bodyContent: '<p>Welcome!</p>',
  version: '1.0',
  authorId: 'user-1',
  publishedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-06-01'),
  deletedAt: null,
};

const RESOURCE_SOFT_DELETED = {
  ...RESOURCE,
  deletedAt: new Date('2026-06-20'),
};

const VERSIONS = [
  {
    id: 'v1',
    resourceId: 'resource-1',
    fileUrl: null,
    fileType: null,
    fileSize: null,
    version: '1.0',
    notes: 'Initial',
    createdAt: new Date('2026-06-01'),
  },
  {
    id: 'v2',
    resourceId: 'resource-1',
    fileUrl: 'https://example.com/v2.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    version: '2.0',
    notes: null,
    createdAt: new Date('2026-06-15'),
  },
];

describe('Resources [id] API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.mockRole = 'ADMIN';
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.hasPermissionMock.mockReturnValue(false);
    mocks.dbMock.select = vi.fn();
    mocks.dbMock.insert = vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    }));
    mocks.dbMock.update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── GET ────────────────────────────────────────────────────────────

  describe('GET', () => {
    function callGet(id: string = 'resource-1') {
      return GET(new Request(`http://localhost:3000/api/resources/${id}`), {
        params: Promise.resolve({ id }),
      });
    }

    it('returns 404 when resource not found', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.dbMock.select
        .mockReturnValueOnce(makeUserSelect('ADMIN'))
        .mockReturnValueOnce(makeOwnerSelect(false))
        .mockReturnValueOnce(makeSelectChain([]));

      const res = await callGet();
      expect(res.status).toBe(404);
    });

    it('returns 200 with versions for ADMIN', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.hasPermissionMock.mockReturnValue(true);
      mocks.dbMock.select
        .mockReturnValueOnce(makeOwnerSelect(true))
        .mockReturnValueOnce(makeSelectChain([RESOURCE]))
        .mockReturnValueOnce(makeSelectChain(VERSIONS));

      const res = await callGet();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.title).toBe('Community Guide');
      expect(body.data.versions).toHaveLength(2);
    });

    it('returns 200 with versions for MANAGER (role-based access)', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.mockRole = 'MANAGER';
      mocks.dbMock.select
        .mockReturnValueOnce(makeOwnerSelect(true))
        .mockReturnValueOnce(makeSelectChain([RESOURCE]))
        .mockReturnValueOnce(makeSelectChain(VERSIONS));

      const res = await callGet();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.versions).toHaveLength(2);
    });

    it('returns 200 with versions for BOARD (role-based access)', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.mockRole = 'BOARD';
      mocks.dbMock.select
        .mockReturnValueOnce(makeOwnerSelect(true))
        .mockReturnValueOnce(makeSelectChain([RESOURCE]))
        .mockReturnValueOnce(makeSelectChain(VERSIONS));

      const res = await callGet();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.versions).toHaveLength(2);
    });

    it('returns 200 for COMMITTEE with ALL_RESIDENTS visibility', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.mockRole = 'COMMITTEE';
      mocks.dbMock.select
        .mockReturnValueOnce(makeOwnerSelect(false))
        .mockReturnValueOnce(makeSelectChain([RESOURCE]))
        .mockReturnValueOnce(makeSelectChain(VERSIONS));

      const res = await callGet();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.visibility).toBe('ALL_RESIDENTS');
    });

    it('returns 403 for COMMITTEE with BOARD_ONLY visibility', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.mockRole = 'COMMITTEE';
      mocks.dbMock.select
        .mockReturnValueOnce(makeOwnerSelect(false))
        .mockReturnValueOnce(makeSelectChain([{ ...RESOURCE, visibility: 'BOARD_ONLY' }]));

      const res = await callGet();
      expect(res.status).toBe(403);
    });

    it('returns 200 for RESIDENT owner with ALL_RESIDENTS', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.mockRole = 'RESIDENT';
      mocks.dbMock.select
        .mockReturnValueOnce(makeOwnerSelect(true))
        .mockReturnValueOnce(makeSelectChain([RESOURCE]))
        .mockReturnValueOnce(makeSelectChain(VERSIONS));

      const res = await callGet();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.visibility).toBe('ALL_RESIDENTS');
    });

    it('returns 403 for RESIDENT owner with BOARD_ONLY', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.mockRole = 'RESIDENT';
      mocks.dbMock.select
        .mockReturnValueOnce(makeOwnerSelect(true))
        .mockReturnValueOnce(makeSelectChain([{ ...RESOURCE, visibility: 'BOARD_ONLY' }]));

      const res = await callGet();
      expect(res.status).toBe(403);
    });

    it('returns 403 for RESIDENT owner with COMMITTEE_ONLY', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.mockRole = 'RESIDENT';
      mocks.dbMock.select
        .mockReturnValueOnce(makeOwnerSelect(true))
        .mockReturnValueOnce(makeSelectChain([{ ...RESOURCE, visibility: 'COMMITTEE_ONLY' }]));

      const res = await callGet();
      expect(res.status).toBe(403);
    });

    it('returns 200 for RESIDENT non-owner with ALL_RESIDENTS', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.mockRole = 'RESIDENT';
      mocks.dbMock.select
        .mockReturnValueOnce(makeOwnerSelect(false))
        .mockReturnValueOnce(makeSelectChain([RESOURCE]))
        .mockReturnValueOnce(makeSelectChain(VERSIONS));

      const res = await callGet();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.visibility).toBe('ALL_RESIDENTS');
    });

    it('returns 403 for RESIDENT non-owner with restricted visibility', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.mockRole = 'RESIDENT';
      mocks.dbMock.select
        .mockReturnValueOnce(makeOwnerSelect(false))
        .mockReturnValueOnce(makeSelectChain([{ ...RESOURCE, visibility: 'OWNERS_ONLY' }]));

      const res = await callGet();
      expect(res.status).toBe(403);
    });

    it('returns 200 for unauthenticated user with ALL_RESIDENTS', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([RESOURCE]))
        .mockReturnValueOnce(makeSelectChain(VERSIONS));

      const res = await callGet();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.visibility).toBe('ALL_RESIDENTS');
    });

    it('returns 403 for unauthenticated user with restricted visibility', async () => {
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ ...RESOURCE, visibility: 'OWNERS_ONLY' }])
      );

      const res = await callGet();
      expect(res.status).toBe(403);
    });
  });

  // ─── PATCH ──────────────────────────────────────────────────────────

  describe('PATCH', () => {
    function callPatch(id: string = 'resource-1', body: Record<string, unknown> = {}) {
      return PATCH(
        new Request(`http://localhost:3000/api/resources/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id }) }
      );
    }

    it('returns 401 when unauthenticated', async () => {
      const res = await callPatch();
      expect(res.status).toBe(401);
    });

    it('returns 403 without content permission', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.dbMock.select.mockReturnValueOnce(makeUserSelect('RESIDENT'));

      const res = await callPatch();
      expect(res.status).toBe(403);
    });

    it('returns 404 when resource not found', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.hasPermissionMock.mockReturnValue(true);
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const res = await callPatch();
      expect(res.status).toBe(404);
    });

    it('returns 410 when resource has been soft-deleted', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.hasPermissionMock.mockReturnValue(true);
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([RESOURCE_SOFT_DELETED]));

      const res = await callPatch();
      expect(res.status).toBe(410);
    });

    it('updates basic fields successfully', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.hasPermissionMock.mockReturnValue(true);
      const updated = { ...RESOURCE, title: 'Updated Guide' };
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([RESOURCE]));
      mocks.dbMock.update.mockReturnValueOnce(makeUpdateChain([updated]));

      const res = await callPatch('resource-1', { title: 'Updated Guide' });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.title).toBe('Updated Guide');
      expect(mocks.dbMock.insert).not.toHaveBeenCalled();
      expect(mocks.dbMock.update).toHaveBeenCalledWith(expect.anything());
    });

    it('saves version history when fileUrl changes', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.hasPermissionMock.mockReturnValue(true);
      const resourceWithFile = {
        ...RESOURCE,
        fileUrl: 'https://old.pdf',
        fileType: 'application/pdf',
        fileSize: 500,
      };
      const updated = { ...resourceWithFile, fileUrl: 'https://new.pdf' };
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([resourceWithFile]));
      mocks.dbMock.insert.mockReturnValueOnce({ values: vi.fn() });
      mocks.dbMock.update.mockReturnValueOnce(makeUpdateChain([updated]));

      const res = await callPatch('resource-1', { fileUrl: 'https://new.pdf' });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(mocks.dbMock.insert).toHaveBeenCalledWith(expect.anything());
      expect(body.data.fileUrl).toBe('https://new.pdf');
    });

    it('saves version history when version changes', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.hasPermissionMock.mockReturnValue(true);
      const resourceWithVersion = { ...RESOURCE, version: '1.0' };
      const updated = { ...resourceWithVersion, version: '2.0' };
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([resourceWithVersion]));
      mocks.dbMock.insert.mockReturnValueOnce({ values: vi.fn() });
      mocks.dbMock.update.mockReturnValueOnce(makeUpdateChain([updated]));

      const res = await callPatch('resource-1', { version: '2.0', versionNotes: 'Major update' });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(mocks.dbMock.insert).toHaveBeenCalledWith(expect.anything());
      expect(body.data.version).toBe('2.0');
    });

    it('handles publishedAt date conversion', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.hasPermissionMock.mockReturnValue(true);
      const updated = { ...RESOURCE, publishedAt: new Date('2026-07-01T00:00:00Z') };
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([RESOURCE]));
      mocks.dbMock.update.mockReturnValueOnce(makeUpdateChain([updated]));

      const res = await callPatch('resource-1', { publishedAt: '2026-07-01T00:00:00Z' });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.publishedAt).toBeDefined();
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────

  describe('DELETE', () => {
    function callDelete(id: string = 'resource-1') {
      return DELETE(
        new Request(`http://localhost:3000/api/resources/${id}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id }) }
      );
    }

    it('returns 401 when unauthenticated', async () => {
      const res = await callDelete();
      expect(res.status).toBe(401);
    });

    it('returns 403 without admin permission', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.dbMock.select.mockReturnValueOnce(makeUserSelect('RESIDENT'));

      const res = await callDelete();
      expect(res.status).toBe(403);
    });

    it('returns 404 when resource not found', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.hasPermissionMock.mockReturnValue(true);
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const res = await callDelete();
      expect(res.status).toBe(404);
    });

    it('soft-deletes and returns success', async () => {
      mocks.sessionResult = { user: { id: 'user-1' }, session: { id: 'sess-1' } };
      mocks.hasPermissionMock.mockReturnValue(true);
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: RESOURCE.id }]));
      mocks.dbMock.update.mockReturnValueOnce(makeUpdateChain([RESOURCE]));

      const res = await callDelete();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.success).toBe(true);
      expect(mocks.dbMock.update).toHaveBeenCalledWith(expect.anything());
      expect(mocks.revalidateContent).toHaveBeenCalledTimes(1);
    });
  });
});
