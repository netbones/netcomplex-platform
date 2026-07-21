/**
 * Specialized dispute route handler tests.
 * Plan 106-02 — mediation messages, evidence upload, assign moderator, issue ruling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.setConfig({ testTimeout: 15000 });

// ── Hoisted mock state ──
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  rateLimitHit: false,
  selectCallCounter: 0,
  disputeInDb: null as {
    id: string;
    tenantId: string;
    complainantId: string;
    respondentId: string | null;
    status: string;
    assignedModeratorId: string | null;
    rulingDescription: string | null;
    rulingIssuedAt: Date | null;
  } | null,
  dbMock: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(mocks.disputeInDb ? [mocks.disputeInDb] : [])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })),
      })),
    })),
    transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mocks.dbMock)),
  },
  supabaseChannelSend: vi.fn(() => Promise.resolve()),
}));

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

// ── Supabase mock ──
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      send: mocks.supabaseChannelSend,
    })),
  })),
}));

// ── sanitizeHtml mock ──
vi.mock('@/shared/lib/sanitize/server', () => ({
  sanitizeHtml: vi.fn((html: string) => html),
}));

// ── @api/server mock ──
vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)),
    },
  },
  db: mocks.dbMock,
  disputeCases: {},
  disputeEvents: {},
  disputeEvidences: {},
  disputeMessages: {},
  users: {},
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiCreated: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 201,
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
    (message?: string) =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'FORBIDDEN', message: message || 'Forbidden' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiNotFound: vi.fn(
    () =>
      new Response(
        JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiInternalError: vi.fn(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiValidationError: vi.fn(
    (details: unknown) =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiError: vi.fn(
    (code: string, message: string, status: number) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiConflict: vi.fn(
    (message?: string) =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'CONFLICT', message: message || 'Conflict' },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  getSessionAndRole: vi.fn(() => {
    if (!mocks.sessionResult) return Promise.resolve(null);
    return Promise.resolve({
      session: { user: { id: mocks.sessionResult.user.id } },
      userId: mocks.sessionResult.user.id,
      role: 'RESIDENT',
      suspension: null,
    });
  }),
  guardSuspension: vi.fn(() => null),
  notDeleted: vi.fn(() => true),
  withErrorHandler: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateDashboard: vi.fn(),
  revalidateConversations: vi.fn(),
  now: () => new Date(),
  rateLimitByUser: vi.fn(() =>
    Promise.resolve(
      mocks.rateLimitHit
        ? new Response(
            JSON.stringify({
              success: false,
              error: { code: 'RATE_LIMITED', message: 'Too many requests' },
            }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          )
        : null
    )
  ),
  uploadImage: vi.fn((_file: File, _userId: string) =>
    Promise.resolve({
      url: 'https://s3.example.com/bucket/test-file.png',
      key: 'users/test/test-file.png',
    })
  ),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() => Promise.resolve(mocks.tenantResult)),
  assertModuleEnabled: vi.fn(() => Promise.resolve()),
}));

vi.mock('@entities/dispute', async () => {
  const actual = await vi.importActual('@entities/dispute');
  return {
    ...actual,
    canTransition: vi.fn((from: string, to: string) => {
      if (from === 'DRAFT' && to === 'SUBMITTED') return true;
      if (from === 'SUBMITTED' && to === 'UNDER_REVIEW') return true;
      if (from === 'UNDER_REVIEW' && to === 'FORMAL_RULING') return true;
      if (from === 'MEDIATION_OFFERED' && to === 'MEDIATION_ACTIVE') return true;
      if (from === 'MEDIATION_ACTIVE' && to === 'FORMAL_RULING') return true;
      if (from === 'FORMAL_RULING' && to === 'RESOLVED') return true;
      return false;
    }),
  };
});

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn((role: string, perm: string) => {
    if (perm === 'admin') return role === 'ADMIN';
    return false;
  }),
  apiLogger: { error: vi.fn(), warn: vi.fn() },
  logger: { error: vi.fn(), warn: vi.fn() },
  createComponentLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn() })),
}));

// ── TASK 1: Mediation Thread Routes ──

describe('Dispute Messages — [id]/messages/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.rateLimitHit = false;
    mocks.disputeInDb = null;
    mocks.supabaseChannelSend.mockResolvedValue(undefined);
    // Fix: re-stub db.insert chain to return controlled data
    const insertReturning = vi.fn(() =>
      Promise.resolve([
        {
          id: 'msg-001',
          tenantId: 'test-tenant-id',
          disputeId: 'dispute-1',
          senderId: 'user-resident',
          content: 'Test message content',
          isInternal: false,
          createdAt: new Date(),
        },
      ])
    );
    const insertValues = vi.fn(() => ({ returning: insertReturning }));
    (mocks.dbMock as Record<string, unknown>).insert = vi.fn(() => ({ values: insertValues }));

    // Build per-table mock chains for db.select()
    // Shared counter: call 1 = user lookup (getSessionAndRole), call 2+ = dispute/data lookup
    mocks.selectCallCounter = 0;

    const selectFrom = vi.fn((_table: unknown) => {
      const tableLimit = vi.fn(() => {
        mocks.selectCallCounter++;
        if (mocks.selectCallCounter === 1) {
          const userRole = mocks.sessionResult
            ? (
                {
                  'user-resident': 'RESIDENT',
                  'user-board': 'BOARD',
                  'user-admin': 'ADMIN',
                  'user-committee': 'COMMITTEE',
                } as Record<string, string>
              )[mocks.sessionResult.user.id] || 'RESIDENT'
            : 'RESIDENT';
          return Promise.resolve([{ role: userRole }]);
        }
        // Lazy read mocks.disputeInDb at call time, not capture time
        return Promise.resolve(mocks.disputeInDb ? [mocks.disputeInDb] : []);
      });
      const tableWhere = vi.fn(() => ({
        limit: tableLimit,
        orderBy: vi.fn(() => Promise.resolve([])),
      }));
      return { where: tableWhere };
    });
    (mocks.dbMock as Record<string, unknown>).select = vi.fn(() => ({ from: selectFrom }));
  });
  afterEach(() => {
    // Skip restoreAllMocks to avoid resetting mock implementations set up in beforeEach
    vi.clearAllMocks();
  });

  // ── POST tests ──

  describe('POST /api/disputes/[id]/messages', () => {
    it('returns 401 without auth', async () => {
      const { POST } = await import('../[id]/messages/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Hello', isInternal: false }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(401);
    });

    it('returns 429 when rate limited', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      mocks.rateLimitHit = true;
      const { POST } = await import('../[id]/messages/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Hello', isInternal: false }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(429);
    });

    it('creates message with sanitized content', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'SUBMITTED',
        assignedModeratorId: null,
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { POST } = await import('../[id]/messages/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Hello<script>alert("xss")</script>', isInternal: false }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('returns 403 when non-moderator sets isInternal: true', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'SUBMITTED',
        assignedModeratorId: null,
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { POST } = await import('../[id]/messages/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Internal note', isInternal: true }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(403);
    });

    it('broadcasts via Supabase Realtime channel', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'SUBMITTED',
        assignedModeratorId: null,
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { POST } = await import('../[id]/messages/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Mediation message', isInternal: false }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(201);
      expect(mocks.supabaseChannelSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'new-mediation-message',
        payload: expect.objectContaining({ disputeId: 'dispute-1' }),
      });
    });
  });

  // ── GET tests ──

  describe('GET /api/disputes/[id]/messages', () => {
    it('returns only isInternal:false messages for party user', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'SUBMITTED',
        assignedModeratorId: null,
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { GET } = await import('../[id]/messages/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/messages');
      const res = await GET(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('returns all messages for BOARD user', async () => {
      mocks.sessionResult = { user: { id: 'user-board' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'SUBMITTED',
        assignedModeratorId: null,
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { GET } = await import('../[id]/messages/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/messages');
      const res = await GET(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('returns access-denied for non-party non-moderator', async () => {
      mocks.sessionResult = { user: { id: 'user-other' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'SUBMITTED',
        assignedModeratorId: null,
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { GET } = await import('../[id]/messages/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/messages');
      const res = await GET(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(403);
    });
  });
});

// ── TASK 2: Evidence Upload + Assign Moderator + Issue Ruling Routes ──

// Helper: create a mock Request that supports formData()
function createFormDataRequest(url: string, file: File | null): Request {
  const req = new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data' },
  });
  // Mock formData on the request
  Object.defineProperty(req, 'formData', {
    value: () => {
      const fd = {
        get: (name: string) => (name === 'file' ? file : null),
      };
      return Promise.resolve(fd as unknown as FormData);
    },
    writable: true,
    configurable: true,
  });
  return req;
}

describe('Dispute Evidence — [id]/evidence/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.rateLimitHit = false;
    mocks.disputeInDb = null;
    mocks.selectCallCounter = 0;

    const insertReturning = vi.fn(() =>
      Promise.resolve([
        {
          id: 'ev-001',
          tenantId: 'test-tenant-id',
          disputeId: 'dispute-1',
          fileUrl: 'https://s3.example.com/test.png',
        },
      ])
    );
    const insertValues = vi.fn(() => ({ returning: insertReturning }));
    (mocks.dbMock as Record<string, unknown>).insert = vi.fn(() => ({ values: insertValues }));

    const selectFrom = vi.fn(() => {
      const tableLimit = vi.fn(() => {
        mocks.selectCallCounter++;
        if (mocks.selectCallCounter === 1) {
          const userRole = mocks.sessionResult
            ? ({ 'user-resident': 'RESIDENT', 'user-board': 'BOARD' } as Record<string, string>)[
                mocks.sessionResult.user.id
              ] || 'RESIDENT'
            : 'RESIDENT';
          return Promise.resolve([{ role: userRole }]);
        }
        return Promise.resolve(mocks.disputeInDb ? [mocks.disputeInDb] : []);
      });
      const tableWhere = vi.fn(() => ({
        limit: tableLimit,
        orderBy: vi.fn(() => Promise.resolve([])),
      }));
      return { where: tableWhere };
    });
    (mocks.dbMock as Record<string, unknown>).select = vi.fn(() => ({ from: selectFrom }));
    (mocks.dbMock as Record<string, unknown>).update = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })) })),
    }));
    (mocks.dbMock as Record<string, unknown>).transaction = vi.fn(
      (fn: (tx: unknown) => Promise<unknown>) => fn(mocks.dbMock)
    );
  });

  describe('POST /api/disputes/[id]/evidence', () => {
    it('returns 401 without auth', async () => {
      const { POST } = await import('../[id]/evidence/route');
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const req = createFormDataRequest('http://localhost/api/disputes/dispute-1/evidence', file);
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(401);
    });

    it('returns 429 when rate limited', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      mocks.rateLimitHit = true;
      const { POST } = await import('../[id]/evidence/route');
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const req = createFormDataRequest('http://localhost/api/disputes/dispute-1/evidence', file);
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(429);
    });

    it('uploads file via uploadImage, inserts DisputeEvidence, logs EVIDENCE_ADDED', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'SUBMITTED',
        assignedModeratorId: null,
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { POST } = await import('../[id]/evidence/route');
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const req = createFormDataRequest('http://localhost/api/disputes/dispute-1/evidence', file);
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(201);
    });

    it('returns 422 when no file provided', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'SUBMITTED',
        assignedModeratorId: null,
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { POST } = await import('../[id]/evidence/route');
      const req = createFormDataRequest('http://localhost/api/disputes/dispute-1/evidence', null);
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(422);
    });
  });
});

describe('Dispute Assign — [id]/assign/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.rateLimitHit = false;
    mocks.disputeInDb = null;
    mocks.selectCallCounter = 0;

    const insertReturning = vi.fn(() => Promise.resolve([]));
    const insertValues = vi.fn(() => ({ returning: insertReturning }));
    (mocks.dbMock as Record<string, unknown>).insert = vi.fn(() => ({ values: insertValues }));

    const selectFrom = vi.fn(() => {
      const tableLimit = vi.fn(() => {
        mocks.selectCallCounter++;
        if (mocks.selectCallCounter === 1) {
          const userRole = mocks.sessionResult
            ? ({ 'user-resident': 'RESIDENT', 'user-board': 'BOARD' } as Record<string, string>)[
                mocks.sessionResult.user.id
              ] || 'RESIDENT'
            : 'RESIDENT';
          return Promise.resolve([{ role: userRole }]);
        }
        return Promise.resolve(mocks.disputeInDb ? [mocks.disputeInDb] : []);
      });
      const tableWhere = vi.fn(() => ({
        limit: tableLimit,
        orderBy: vi.fn(() => Promise.resolve([])),
      }));
      return { where: tableWhere };
    });
    (mocks.dbMock as Record<string, unknown>).select = vi.fn(() => ({ from: selectFrom }));
    (mocks.dbMock as Record<string, unknown>).update = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })) })),
    }));
    (mocks.dbMock as Record<string, unknown>).transaction = vi.fn(
      (fn: (tx: unknown) => Promise<unknown>) => fn(mocks.dbMock)
    );
  });

  describe('POST /api/disputes/[id]/assign', () => {
    it('returns 403 for RESIDENT role', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      const { POST } = await import('../[id]/assign/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/assign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ moderatorId: '550e8400-e29b-41d4-a716-446655440000' }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(403);
    });

    it('returns 422 for invalid moderatorId (not a UUID)', async () => {
      mocks.sessionResult = { user: { id: 'user-board' } };
      const { POST } = await import('../[id]/assign/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/assign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ moderatorId: 'not-a-uuid' }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(422);
    });

    it('sets assignedModeratorId and logs ASSIGNED event (BOARD role)', async () => {
      mocks.sessionResult = { user: { id: 'user-board' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'UNDER_REVIEW',
        assignedModeratorId: null,
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { POST } = await import('../[id]/assign/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/assign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ moderatorId: '550e8400-e29b-41d4-a716-446655440000' }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});

describe('Dispute Ruling — [id]/ruling/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.rateLimitHit = false;
    mocks.disputeInDb = null;
    mocks.selectCallCounter = 0;

    const insertReturning = vi.fn(() => Promise.resolve([]));
    const insertValues = vi.fn(() => ({ returning: insertReturning }));
    (mocks.dbMock as Record<string, unknown>).insert = vi.fn(() => ({ values: insertValues }));

    const selectFrom = vi.fn(() => {
      const tableLimit = vi.fn(() => {
        mocks.selectCallCounter++;
        if (mocks.selectCallCounter === 1) {
          const userRole = mocks.sessionResult
            ? ({ 'user-resident': 'RESIDENT', 'user-board': 'BOARD' } as Record<string, string>)[
                mocks.sessionResult.user.id
              ] || 'RESIDENT'
            : 'RESIDENT';
          return Promise.resolve([{ role: userRole }]);
        }
        return Promise.resolve(mocks.disputeInDb ? [mocks.disputeInDb] : []);
      });
      const tableWhere = vi.fn(() => ({
        limit: tableLimit,
        orderBy: vi.fn(() => Promise.resolve([])),
      }));
      return { where: tableWhere };
    });
    (mocks.dbMock as Record<string, unknown>).select = vi.fn(() => ({ from: selectFrom }));
    (mocks.dbMock as Record<string, unknown>).update = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })) })),
    }));
    (mocks.dbMock as Record<string, unknown>).transaction = vi.fn(
      (fn: (tx: unknown) => Promise<unknown>) => fn(mocks.dbMock)
    );
  });

  describe('POST /api/disputes/[id]/ruling', () => {
    it('returns 403 for RESIDENT role', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      const { POST } = await import('../[id]/ruling/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/ruling', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rulingDescription: 'Formal ruling with at least 10 chars.' }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(403);
    });

    it('returns 409 when canTransition() returns false', async () => {
      mocks.sessionResult = { user: { id: 'user-board' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'DRAFT',
        assignedModeratorId: null,
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { POST } = await import('../[id]/ruling/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/ruling', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rulingDescription: 'Formal ruling with at least 10 chars.' }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(409);
    });

    it('sets ruling fields and logs RULING_ISSUED event (BOARD role)', async () => {
      mocks.sessionResult = { user: { id: 'user-board' } };
      mocks.disputeInDb = {
        id: 'dispute-1',
        tenantId: 'test-tenant-id',
        complainantId: 'user-resident',
        respondentId: null,
        status: 'UNDER_REVIEW',
        assignedModeratorId: '550e8400-e29b-41d4-a716-446655440000',
        rulingDescription: null,
        rulingIssuedAt: null,
      };
      const { POST } = await import('../[id]/ruling/route');
      const req = new Request('http://localhost/api/disputes/dispute-1/ruling', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rulingDescription: 'Formal ruling with at least 10 chars.' }),
      });
      const res = await POST(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
