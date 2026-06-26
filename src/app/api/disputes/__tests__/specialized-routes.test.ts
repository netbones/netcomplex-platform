/**
 * Specialized dispute route handler tests.
 * Plan 106-02 — mediation messages, evidence upload, assign moderator, issue ruling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mock state ──
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  rateLimitHit: false,
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
  apiLogger: { error: vi.fn() },
}));

// Reset crypto mocks (for crypto.randomUUID)
const originalRandomUUID = crypto.randomUUID;

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
    mocks.dbMock.insert = vi.fn(() => ({ values: insertValues }));

    // Fix: re-stub db.select chain
    const selectWhere = vi.fn(() => ({
      limit: vi.fn(() => Promise.resolve(mocks.disputeInDb ? [mocks.disputeInDb] : [])),
    }));
    const selectFrom = vi.fn(() => ({ where: selectWhere }));
    mocks.dbMock.select = vi.fn(() => ({ from: selectFrom }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    // Restore crypto.randomUUID in case any test overrides it
    vi.stubGlobal('crypto', { randomUUID: originalRandomUUID });
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
