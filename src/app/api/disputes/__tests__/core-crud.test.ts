/**
 * Core CRUD route handler tests for dispute API.
 * Plan 106-01 Task 2 — TDD RED phase.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

// ── Hoisted mock state ──
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                offset: vi.fn(() => Promise.resolve([])),
              })),
            })),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })),
        })),
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })) })),
    })),
    transaction: vi.fn((fn: (tx: unknown) => Promise<void>) => fn(mocks.dbMock)),
  },
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

vi.mock('@api/server', () => ({
  auth: { api: { getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)) } },
  db: mocks.dbMock,
  disputeCases: {},
  disputeEvents: {},
  disputeEvidences: {},
  users: {},
  notDeleted: vi.fn(() => true),
  guardSuspension: vi.fn(() => null),
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
    () =>
      new Response(
        JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
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
  now: () => new Date(),
  getSessionAndRole: vi.fn(() =>
    Promise.resolve(
      mocks.sessionResult
        ? {
            session: {
              user: { id: mocks.sessionResult.user.id, email: 'test@test.com', name: 'Test' },
            },
            userId: mocks.sessionResult.user.id,
            role: 'RESIDENT',
            suspension: null,
          }
        : null
    )
  ),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() => Promise.resolve(mocks.tenantResult)),
  assertModuleEnabled: vi.fn(() => Promise.resolve()),
}));

vi.mock('@entities/dispute/server', () => ({
  generateDisputeReference: vi.fn(() => Promise.resolve('DSP-2026-0043')),
}));

vi.mock('@entities/dispute', async () => {
  const actual = await vi.importActual('@entities/dispute');
  return {
    ...actual,
    canTransition: vi.fn((from: string, to: string) => {
      if (from === 'DRAFT' && to === 'SUBMITTED') return true;
      if (from === 'DRAFT' && to === 'WITHDRAWN') return true;
      if (from === 'DRAFT' && to === 'RESOLVED') return false;
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
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

// Pre-warm route imports to avoid i18n timeout on first test
beforeAll(async () => {
  await import('../route');
  await import('../[id]/route');
});

describe('Dispute API — route.ts (GET list, POST create)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
  });
  afterEach(() => vi.restoreAllMocks());

  describe('GET /api/disputes', () => {
    it('returns 401 when no auth session', { timeout: 15000 }, async () => {
      const { GET } = await import('../route');
      const req = new Request('http://localhost/api/disputes');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns empty array for user with no disputes', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      const { GET } = await import('../route');
      const req = new Request('http://localhost/api/disputes');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe('POST /api/disputes', () => {
    it('returns 401 when no auth session', async () => {
      const { POST } = await import('../route');
      const req = new Request('http://localhost/api/disputes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category: 'NOISE',
          title: 'Test Dispute',
          description: 'A valid description for testing.',
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 422 for invalid body (missing title)', async () => {
      mocks.sessionResult = { user: { id: 'user-resident' } };
      const { POST } = await import('../route');
      const req = new Request('http://localhost/api/disputes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category: 'NOISE', description: 'Missing title in this request.' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(422);
    });
  });
});

describe('Dispute API — [id]/route.ts (GET single, PATCH update)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
  });
  afterEach(() => vi.restoreAllMocks());

  describe('GET /api/disputes/[id]', () => {
    it('returns 401 without auth', async () => {
      const { GET } = await import('../[id]/route');
      const req = new Request('http://localhost/api/disputes/dispute-1');
      const res = await GET(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/disputes/[id]', () => {
    it('returns 401 without auth', async () => {
      const { PATCH } = await import('../[id]/route');
      const req = new Request('http://localhost/api/disputes/dispute-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Updated title here.' }),
      });
      const res = await PATCH(req, {
        params: Promise.resolve({ id: 'dispute-1' }),
      } as { params: Promise<{ id: string }> });
      expect(res.status).toBe(401);
    });
  });
});
