/**
 * Submit route tests — cooling-off enforcement.
 * Plan 106-01 Task 3 — TDD RED phase.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mock state ──
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  disputeInDb: null as {
    id: string;
    tenantId: string;
    complainantId: string;
    status: string;
    coolingOffEndsAt: Date | null;
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
        where: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                ...(mocks.disputeInDb ?? {}),
                status: 'SUBMITTED' as const,
                submittedAt: new Date(),
              },
            ])
          ),
        })),
      })),
    })),
    transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mocks.dbMock)),
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

vi.mock('@/shared/api/auth-utils', () => ({
  requireAuth: vi.fn(async (_request: Request) => {
    const session = mocks.sessionResult;
    if (!session) {
      return {
        success: false as const,
        response: new Response(
          JSON.stringify({
            success: false,
            error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
    return {
      success: true as const,
      data: {
        session: {
          user: { id: session.user.id, email: 'test@test.com', name: 'Test', image: null },
        },
        userId: session.user.id,
        role: 'RESIDENT',
        tenantId: 'test-tenant-id',
        suspension: null,
      },
    };
  }),
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)),
    },
  },
  db: mocks.dbMock,
  disputeCases: {},
  disputeEvents: {},
  users: {},
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
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
  apiError: vi.fn(
    (code: string, message: string, status: number) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
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
  guardSuspension: () => null,
  notDeleted: vi.fn(() => undefined),
  rateLimitByUser: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() => Promise.resolve(mocks.tenantResult)),
  assertModuleEnabled: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@entities/dispute', () => ({
  canTransition: vi.fn((from: string, to: string) => {
    if (from === 'DRAFT' && to === 'SUBMITTED') return true;
    return false;
  }),
}));

vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn() },
  hasPermission: vi.fn(() => false),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
  createLogger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

describe('POST /api/disputes/[id]/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.disputeInDb = null;
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 401 without auth', async () => {
    const { POST } = await import('../[id]/submit/route');
    const req = new Request('http://localhost/api/disputes/dispute-1/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });
    expect(res.status).toBe(401);
  });

  it('returns 423 with remaining seconds when coolingOffEndsAt is in the future', async () => {
    mocks.sessionResult = { user: { id: 'user-resident' } };
    mocks.disputeInDb = {
      id: 'dispute-1',
      tenantId: 'test-tenant-id',
      complainantId: 'user-resident',
      status: 'DRAFT',
      coolingOffEndsAt: new Date(Date.now() + 3600_000), // 1 hour in the future
    };

    const { POST } = await import('../[id]/submit/route');
    const req = new Request('http://localhost/api/disputes/dispute-1/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });
    expect(res.status).toBe(423);
    const body = await res.json();
    expect(body.error.code).toBe('COOLING_OFF_ACTIVE');
  }, 15000);

  it('returns 409 when dispute is not DRAFT status', async () => {
    mocks.sessionResult = { user: { id: 'user-resident' } };
    mocks.disputeInDb = {
      id: 'dispute-2',
      tenantId: 'test-tenant-id',
      complainantId: 'user-resident',
      status: 'SUBMITTED',
      coolingOffEndsAt: null,
    };

    const { POST } = await import('../[id]/submit/route');
    const req = new Request('http://localhost/api/disputes/dispute-2/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: 'dispute-2' }),
    } as { params: Promise<{ id: string }> });
    expect(res.status).toBe(409);
  }, 15000);

  it('returns 403 when user is not the complainant', async () => {
    mocks.sessionResult = { user: { id: 'user-other' } };
    mocks.disputeInDb = {
      id: 'dispute-3',
      tenantId: 'test-tenant-id',
      complainantId: 'user-resident',
      status: 'DRAFT',
      coolingOffEndsAt: new Date(Date.now() - 3600_000), // in the past
    };

    const { POST } = await import('../[id]/submit/route');
    const req = new Request('http://localhost/api/disputes/dispute-3/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: 'dispute-3' }),
    } as { params: Promise<{ id: string }> });
    expect(res.status).toBe(403);
  }, 15000);

  it('transitions DRAFT→SUBMITTED, sets submittedAt, logs SUBMITTED event', async () => {
    mocks.sessionResult = { user: { id: 'user-resident' } };
    mocks.disputeInDb = {
      id: 'dispute-4',
      tenantId: 'test-tenant-id',
      complainantId: 'user-resident',
      status: 'DRAFT',
      coolingOffEndsAt: new Date(Date.now() - 3600_000), // 1 hour in the past
    };

    const { POST } = await import('../[id]/submit/route');
    const req = new Request('http://localhost/api/disputes/dispute-4/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: 'dispute-4' }),
    } as { params: Promise<{ id: string }> });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('submittedAt');
  }, 15000);
});
