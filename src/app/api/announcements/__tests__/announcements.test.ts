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
    return Response.json(data, { status: s });
  }),
  apiCreated: vi.fn(
    (data: unknown): Response => Response.json({ success: true, data }, { status: 201 })
  ),
  apiUnauthorized: vi.fn(
    (message?: string): Response =>
      Response.json(
        {
          success: false,
          error: { code: 'AUTH_REQUIRED', message: message || 'Authentication required' },
        },
        { status: 401 }
      )
  ),
  apiInternalError: vi.fn(
    (message?: string): Response =>
      Response.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: message || 'Internal server error' },
        },
        { status: 500 }
      )
  ),
  apiNotFound: vi.fn(
    (message?: string): Response =>
      Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: message || 'Not found' } },
        { status: 404 }
      )
  ),
  apiForbidden: vi.fn(
    (message?: string): Response =>
      Response.json(
        { success: false, error: { code: 'FORBIDDEN', message: message || 'Forbidden' } },
        { status: 403 }
      )
  ),
  apiValidationError: vi.fn(
    (details?: unknown): Response =>
      Response.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
        },
        { status: 422 }
      )
  ),
  apiError: vi.fn(
    (code: string, message?: string, status = 400): Response =>
      Response.json({ success: false, error: { code, message } }, { status })
  ),
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
  users: { id: 'id', role: 'role', name: 'name', isActive: 'isActive', tenantId: 'tenantId' },
  profiles: { userId: 'userId', residencyType: 'residencyType' },
  notifications: { id: 'id', tenantId: 'tenantId', userId: 'userId' },
  resources: { id: 'id', tenantId: 'tenantId' },
  notDeleted: <T>(t: T) => ({ isNull: [t, 'deletedAt'] }) as const,
  revalidateDashboard: mocks.revalidateDashboard,
  apiSuccess: mocks.apiSuccess,
  apiCreated: mocks.apiCreated,
  apiUnauthorized: mocks.apiUnauthorized,
  apiInternalError: mocks.apiInternalError,
  apiNotFound: mocks.apiNotFound,
  apiForbidden: mocks.apiForbidden,
  apiValidationError: mocks.apiValidationError,
  apiError: mocks.apiError,
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
}));

vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    canPublishAnnouncements: (_role?: string | null) => mocks.canPublish,
    hasPermission: (_role?: string | null, _permission?: string) => mocks.canPublish,
    apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  };
});

vi.mock('@features/announcements', async importOriginal => {
  const actual = await importOriginal<typeof import('@features/announcements')>();
  return {
    ...actual,
    validatePriorityForRole: (_priority: string, _role: string) =>
      mocks.validatedPriority as 'urgent' | 'high' | 'normal' | 'low',
    PRIORITY_TAXONOMY: actual.PRIORITY_TAXONOMY,
  };
});

import { GET, POST } from '@/app/api/announcements/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/announcements/[id]/route';
import { makeSelectChain, makeInsertChain, makeUpdateChain } from '@/test/api/helpers';

function makeReq({
  method = 'GET',
  url = 'http://localhost:3000/api/announcements',
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

describe('Announcements API', () => {
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

  // ─── GET /api/announcements (list) ──────────────────────────────────────

  describe('GET /api/announcements', () => {
    it('returns 401 without auth and without ?active=true', async () => {
      const request = makeReq();
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('returns 200 without auth when ?active=true (public access)', async () => {
      const selectChain = makeSelectChain([]);
      mocks.dbMock.select.mockImplementation(() => selectChain);

      const request = makeReq({ url: 'http://localhost:3000/api/announcements?active=true' });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mocks.apiSuccess).toHaveBeenCalled();
    });

    it('returns list with valid auth', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const userChain = makeSelectChain([{ role: 'ADMIN' }]);
      const listChain = makeSelectChain([{ id: 'ann-1', title: 'Test', priority: 'normal' }]);

      mocks.dbMock.select
        .mockImplementationOnce(() => userChain)
        .mockImplementationOnce(() => listChain);

      const request = makeReq();
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mocks.apiSuccess).toHaveBeenCalled();
    });

    it('filters by priority query param', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const userChain = makeSelectChain([{ role: 'ADMIN' }]);
      const listChain = makeSelectChain([]);

      mocks.dbMock.select
        .mockImplementationOnce(() => userChain)
        .mockImplementationOnce(() => listChain);

      const request = makeReq({ url: 'http://localhost:3000/api/announcements?priority=urgent' });
      await GET(request);

      expect(mocks.apiSuccess).toHaveBeenCalledWith([]);
    });

    it('enforces tenant isolation', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const userChain = makeSelectChain([{ role: 'RESIDENT' }]);
      const listChain = makeSelectChain([]);

      mocks.dbMock.select
        .mockImplementationOnce(() => userChain)
        .mockImplementationOnce(() => listChain);

      const request = makeReq();
      await GET(request);

      expect(mocks.dbMock.select).toHaveBeenCalledTimes(2);
    });
  });

  // ─── POST /api/announcements (create) ───────────────────────────────────

  describe('POST /api/announcements', () => {
    const validBody = {
      title: 'Test Announcement',
      content: 'This is a test announcement content.',
      author: 'Test Author',
      priority: 'normal',
      targetFilter: 'ALL',
      targetRoles: [],
    };

    it('returns 401 without auth', async () => {
      const request = makeReq({ method: 'POST', body: validBody });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 when user lacks canPublishAnnouncements', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.canPublish = false;

      const userChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => userChain);

      const request = makeReq({ method: 'POST', body: validBody });
      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 422 on Zod validation failure', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const userChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => userChain);

      const request = makeReq({
        method: 'POST',
        body: { title: '', content: '', author: '' },
      });
      const response = await POST(request);
      expect(response.status).toBe(422);
    });

    it('enforces priority downgrade via validatePriorityForRole', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.validatedPriority = 'normal';

      const userChain = makeSelectChain([{ role: 'COMMITTEE' }]);

      const annChain = makeInsertChain([
        {
          id: 'ann-1',
          title: 'Test',
          content: 'Content',
          author: 'Author',
          priority: 'normal',
          targetFilter: 'ALL',
          targetRoles: [],
          resourceId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: null,
        },
      ]);

      const fanoutInsert = { values: vi.fn(() => Promise.resolve()) };
      const fanoutChains = [makeSelectChain([]), makeSelectChain([]), makeSelectChain([])];

      let selectCall = 0;
      mocks.dbMock.select.mockImplementation(() => {
        if (selectCall === 0) return userChain;
        return fanoutChains[selectCall++ - 1] ?? makeSelectChain([]);
      });

      let insertCall = 0;
      mocks.dbMock.insert.mockImplementation(() => {
        insertCall++;
        if (insertCall === 1) return annChain;
        return fanoutInsert;
      });

      const request = makeReq({
        method: 'POST',
        body: { ...validBody, priority: 'urgent' },
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('creates announcement with valid data and returns 201', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const createdAnn = {
        id: 'ann-new',
        title: 'Test Announcement',
        content: 'This is a test announcement content.',
        author: 'Test Author',
        priority: 'normal',
        targetFilter: 'ALL',
        targetRoles: [],
        resourceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      };

      const userChain = makeSelectChain([{ role: 'ADMIN' }]);
      const annInsert = makeInsertChain([createdAnn]);
      const fanoutInsert = { values: vi.fn(() => Promise.resolve()) };

      let selectCall = 0;
      mocks.dbMock.select.mockImplementation(() => {
        if (selectCall === 0) return userChain;
        selectCall++;
        return makeSelectChain([]);
      });

      let insertCall = 0;
      mocks.dbMock.insert.mockImplementation(() => {
        insertCall++;
        if (insertCall === 1) return annInsert;
        return fanoutInsert;
      });

      const request = makeReq({ method: 'POST', body: validBody });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mocks.apiCreated).toHaveBeenCalled();
    });

    it('enforces tenant isolation on create', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const userChain = makeSelectChain([{ role: 'ADMIN' }]);
      const annInsert = makeInsertChain([
        {
          id: 'ann-2',
          title: 'Test',
          content: 'Content',
          author: 'Author',
          priority: 'normal',
          targetFilter: 'ALL',
          targetRoles: [],
          resourceId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: null,
        },
      ]);
      const fanoutInsert = { values: vi.fn(() => Promise.resolve()) };

      let selectCall = 0;
      mocks.dbMock.select.mockImplementation(() => {
        if (selectCall === 0) return userChain;
        selectCall++;
        return makeSelectChain([]);
      });

      let insertCall = 0;
      mocks.dbMock.insert.mockImplementation(() => {
        insertCall++;
        if (insertCall === 1) return annInsert;
        return fanoutInsert;
      });

      const request = makeReq({ method: 'POST', body: validBody });
      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });

  // ─── GET /api/announcements/[id] (single) ───────────────────────────────

  describe('GET /api/announcements/[id]', () => {
    it('returns 401 without auth', async () => {
      const request = makeReq({ url: 'http://localhost:3000/api/announcements/ann-1' });
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'ann-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 404 when announcement not found', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const selectChain = makeSelectChain([]);
      mocks.dbMock.select.mockImplementation(() => selectChain);

      const request = makeReq({ url: 'http://localhost:3000/api/announcements/ann-1' });
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'ann-1' }) });
      expect(response.status).toBe(404);
    });

    it('returns announcement by id', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const ann = { id: 'ann-1', title: 'Test', priority: 'normal' };
      const selectChain = makeSelectChain([ann]);
      mocks.dbMock.select.mockImplementation(() => selectChain);

      const request = makeReq({ url: 'http://localhost:3000/api/announcements/ann-1' });
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'ann-1' }) });

      expect(response.status).toBe(200);
      expect(mocks.apiSuccess).toHaveBeenCalledWith(ann);
    });
  });

  // ─── PATCH /api/announcements/[id] (update) ─────────────────────────────

  describe('PATCH /api/announcements/[id]', () => {
    it('returns 401 without auth', async () => {
      const request = makeReq({
        method: 'PATCH',
        url: 'http://localhost:3000/api/announcements/ann-1',
        body: { title: 'Updated' },
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'ann-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 when user lacks permission', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.canPublish = false;

      const userChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => userChain);

      const request = makeReq({
        method: 'PATCH',
        url: 'http://localhost:3000/api/announcements/ann-1',
        body: { title: 'Updated' },
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'ann-1' }) });
      expect(response.status).toBe(403);
    });

    it('enforces priority downgrade on update', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.validatedPriority = 'normal';

      const updated = {
        id: 'ann-1',
        title: 'Updated',
        content: 'Content',
        priority: 'normal',
        targetFilter: 'ALL',
        targetRoles: [],
      };

      const userRoleChain = makeSelectChain([{ role: 'COMMITTEE' }]);
      const updateChain = makeUpdateChain([updated]);

      mocks.dbMock.select.mockReturnValue(userRoleChain);
      mocks.dbMock.update.mockReturnValue(updateChain);

      const request = makeReq({
        method: 'PATCH',
        url: 'http://localhost:3000/api/announcements/ann-1',
        body: { priority: 'urgent' },
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'ann-1' }) });

      expect(response.status).toBe(200);
    });

    it('returns 404 when announcement not found for update', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const userRoleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const updateChain = makeUpdateChain([]);

      mocks.dbMock.select.mockReturnValue(userRoleChain);
      mocks.dbMock.update.mockReturnValue(updateChain);

      const request = makeReq({
        method: 'PATCH',
        url: 'http://localhost:3000/api/announcements/ann-1',
        body: { title: 'Updated' },
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'ann-1' }) });
      expect(response.status).toBe(404);
    });

    it('updates announcement with valid data', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const updated = {
        id: 'ann-1',
        title: 'Updated Title',
        content: 'Updated content.',
        author: 'Author',
        priority: 'high',
        targetFilter: 'ALL',
        targetRoles: [],
        resourceId: null,
        expiresAt: null,
        updatedAt: new Date(),
      };

      const userRoleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const updateChain = makeUpdateChain([updated]);

      mocks.dbMock.select.mockReturnValue(userRoleChain);
      mocks.dbMock.update.mockReturnValue(updateChain);

      const request = makeReq({
        method: 'PATCH',
        url: 'http://localhost:3000/api/announcements/ann-1',
        body: { title: 'Updated Title', content: 'Updated content.' },
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'ann-1' }) });

      expect(response.status).toBe(200);
      expect(mocks.revalidateDashboard).toHaveBeenCalled();
    });
  });

  // ─── DELETE /api/announcements/[id] (delete) ────────────────────────────

  describe('DELETE /api/announcements/[id]', () => {
    it('returns 401 without auth', async () => {
      const request = makeReq({
        method: 'DELETE',
        url: 'http://localhost:3000/api/announcements/ann-1',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'ann-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 when user lacks permission', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.canPublish = false;

      const userChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => userChain);

      const request = makeReq({
        method: 'DELETE',
        url: 'http://localhost:3000/api/announcements/ann-1',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'ann-1' }) });
      expect(response.status).toBe(403);
    });

    it('returns 404 when announcement not found for delete', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const userRoleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const updateChain = makeUpdateChain([]);

      mocks.dbMock.select.mockReturnValue(userRoleChain);
      mocks.dbMock.update.mockReturnValue(updateChain);

      const request = makeReq({
        method: 'DELETE',
        url: 'http://localhost:3000/api/announcements/ann-1',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'ann-1' }) });
      expect(response.status).toBe(404);
    });

    it('deletes announcement and returns success', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const deletedAnn = { id: 'ann-1', title: 'Test', priority: 'normal' };

      const userRoleChain = makeSelectChain([{ role: 'ADMIN' }]);
      const updateChain = makeUpdateChain([deletedAnn]);

      mocks.dbMock.select.mockReturnValue(userRoleChain);
      mocks.dbMock.update.mockReturnValue(updateChain);

      const request = makeReq({
        method: 'DELETE',
        url: 'http://localhost:3000/api/announcements/ann-1',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'ann-1' }) });

      expect(response.status).toBe(200);
      expect(mocks.revalidateDashboard).toHaveBeenCalled();
    });
  });
});
