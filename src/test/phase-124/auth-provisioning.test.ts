import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock state (vitest hoists vi.mock, so references must be hoisted too) ──
const hoisted = vi.hoisted(() => {
  interface MockSession {
    user: { id: string; email: string; emailVerified: boolean; name: string };
    session: { token: string };
  }
  return {
    mockGetSession: vi.fn((): Promise<MockSession | null> => Promise.resolve(null)),
    mockDbSelect: vi.fn(),
    mockDbInsert: vi.fn(),
    mockDbUpdate: vi.fn(),
    mockDbDelete: vi.fn(),
    mockDbTransaction: vi.fn(),
  };
});

// ── Hoisted mocks for every import used by the route ──

vi.mock('@api/server', () => ({
  db: {
    select: hoisted.mockDbSelect,
    insert: hoisted.mockDbInsert,
    update: hoisted.mockDbUpdate,
    delete: hoisted.mockDbDelete,
    transaction: hoisted.mockDbTransaction,
  },
  auth: { api: { getSession: hoisted.mockGetSession } },
  tenants: { id: 'id', name: 'tenants' },
  users: { id: 'id', name: 'users' },
  withErrorHandler: (fn: (...args: unknown[]) => unknown) => fn,
  apiConflict: (msg: string) =>
    new Response(JSON.stringify({ code: 'CONFLICT', error: msg }), {
      status: 409,
      headers: { 'content-type': 'application/json' },
    }),
  apiError: (_code: string, msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  apiInternalError: (msg: string) =>
    new Response(JSON.stringify({ code: 'INTERNAL_ERROR', error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    }),
  apiSuccess: (data: unknown, opts?: { status?: number }) =>
    new Response(JSON.stringify(data), {
      status: opts?.status ?? 200,
      headers: { 'content-type': 'application/json' },
    }),
  apiValidationError: (msg: string) =>
    new Response(JSON.stringify({ code: 'VALIDATION_ERROR', error: msg }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    }),
  apiForbidden: (msg: string) =>
    new Response(JSON.stringify({ code: 'FORBIDDEN', error: msg }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    }),
  apiUnauthorized: (msg: string) =>
    new Response(JSON.stringify({ code: 'AUTH_REQUIRED', error: msg }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }),
  apiCreated: (data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    }),
  apiNotFound: (msg: string) =>
    new Response(JSON.stringify({ code: 'NOT_FOUND', error: msg }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    }),
}));

vi.mock('@entities/setup/server', () => ({
  initTenantSetup: vi.fn(() => Promise.resolve()),
}));

// Mock TIERS config for tier-specific defaults (maxPages, etc.)
vi.mock('@entities/tenant', () => ({
  TIERS: {
    core: { maxPages: 5 },
    foundation: { maxPages: 10 },
    'pro-max': { maxPages: 50 },
  },
}));

vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
  createId: vi.fn(() => 'test-tenant-uuid'),
  createComponentLogger: vi.fn(() => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    child: vi.fn(),
  })),
}));

// Now import the POST handler (uses the mocked @api/server)
import { POST } from '@/app/api/platform/tenants/route';

// ── Helper: create a mock Request ──
function createRequest(body: unknown, sessionToken?: string): NextRequest {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (sessionToken) {
    headers['cookie'] = `better-auth.session_token=${sessionToken}`;
  }
  return new NextRequest('http://localhost:3000/api/platform/tenants', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: 'Test Community',
  slug: 'test-community',
  plan: 'foundation',
} as const;

const authenticatedSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    emailVerified: true,
    name: 'Test User',
  },
  session: { token: 'session-token-abc' },
};

const unverifiedSession = {
  user: {
    id: 'user-456',
    email: 'unverified@example.com',
    emailVerified: false,
    name: 'Unverified User',
  },
  session: { token: 'session-token-def' },
};

describe('POST /api/platform/tenants — authenticated tenant provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return null session (unauthenticated)
    hoisted.mockGetSession.mockResolvedValue(null);
  });

  // ── Test 1: Unauthenticated → 401 ──
  it('Test 1: returns 401 when no session cookie is present', async () => {
    const req = createRequest(validBody);
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code || body.error).toBeDefined();
  });

  // ── Test 2: Authenticated, valid body → 201, Tenant created ──
  it('Test 2: returns 201 with tenant data when authenticated with valid body', async () => {
    hoisted.mockGetSession.mockResolvedValue(authenticatedSession);

    // Mock slug check: no existing tenant
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    hoisted.mockDbSelect.mockReturnValue(selectChain);

    // Mock transaction
    const txInsertChain = {
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([
            { id: 'tenant-1', name: 'Test Community', slug: 'test-community', plan: 'foundation' },
          ]),
      }),
    };
    const txUpdateChain = {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const txObj = {
      insert: vi.fn().mockReturnValue(txInsertChain),
      update: vi.fn().mockReturnValue(txUpdateChain),
    };
    hoisted.mockDbTransaction.mockImplementation(
      async (cb: (tx: typeof txObj) => Promise<void>) => {
        await cb(txObj);
      }
    );

    const req = createRequest(validBody, 'session-token-abc');
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tenant).toBeDefined();
    expect(body.tenantId).toBeDefined();
  });

  // ── Test 3: Slug conflict → 409 ──
  it('Test 3: returns 409 when slug is already taken', async () => {
    hoisted.mockGetSession.mockResolvedValue(authenticatedSession);

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'existing-tenant', slug: 'test-community' }]),
    };
    hoisted.mockDbSelect.mockReturnValue(selectChain);

    const req = createRequest(validBody, 'session-token-abc');
    const res = await POST(req);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error || body.message || '').toMatch(/taken|already/i);
  });

  // ── Test 4: Invalid body (missing name) → 400 ──
  it('Test 4: returns 400 when body is missing required fields', async () => {
    hoisted.mockGetSession.mockResolvedValue(authenticatedSession);

    const req = createRequest({ slug: 'test', plan: 'core' }); // missing name
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code || body.error).toBeDefined();
  });

  // ── Test 5: Unverified email → 403 ──
  it('Test 5: returns 403 when session exists but email is not verified', async () => {
    hoisted.mockGetSession.mockResolvedValue(unverifiedSession);

    const req = createRequest(validBody, 'session-token-def');
    const res = await POST(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code || body.error).toBeDefined();
  });

  // ── Test 6: Created user has role=ADMIN on the new tenant ──
  it('Test 6: sets user role to ADMIN on the newly created tenant', async () => {
    hoisted.mockGetSession.mockResolvedValue(authenticatedSession);

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    hoisted.mockDbSelect.mockReturnValue(selectChain);

    // Capture the update call
    let capturedUpdateSet: Record<string, unknown> | null = null;
    const txUpdateChain = {
      set: vi.fn().mockImplementation((data: Record<string, unknown>) => {
        capturedUpdateSet = data;
        return {
          where: vi.fn().mockResolvedValue(undefined),
        };
      }),
    };
    const txInsertChain = {
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([{ id: 'tenant-1', name: 'Test Community', slug: 'test-community' }]),
      }),
    };
    const txObj = {
      insert: vi.fn().mockReturnValue(txInsertChain),
      update: vi.fn().mockReturnValue(txUpdateChain),
    };
    hoisted.mockDbTransaction.mockImplementation(
      async (cb: (tx: typeof txObj) => Promise<void>) => {
        await cb(txObj);
      }
    );

    const req = createRequest(validBody, 'session-token-abc');
    await POST(req);

    expect(capturedUpdateSet).toBeTruthy();
    expect(capturedUpdateSet!.role).toBe('ADMIN');
    expect(capturedUpdateSet!.tenantId).toBe('tenant-1');
  });
});
