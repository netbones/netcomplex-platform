/**
 * TEST TEMPLATE: tRPC Caller + Next.js REST Route Handler
 *
 * Stack: Next.js App Router · tRPC · Drizzle ORM · Better Auth · Zod · Vitest
 *
 * HOW TO USE
 * ----------
 * 1. Replace every `YOUR_*` token with your actual names.
 * 2. Pick the Drizzle mock pattern that matches your query style (§ 2a or § 2b).
 * 3. Delete the section (tRPC or REST) that doesn't apply to the file under test.
 * 4. Add the DB-error test case for every procedure / handler.
 */

import { expect, test, describe, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { createCallerFactory } from '@trpc/server';
import { NextRequest } from 'next/server';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';

// ─────────────────────────────────────────────────────────────────────────────
// § 0  IMPORTS  (fill in your actual paths)
// ─────────────────────────────────────────────────────────────────────────────

import { appRouter } from '~/server/routers/_app';
// REST handler — import whichever verbs you need:
import { GET, POST } from '~/app/api/YOUR_RESOURCE/route';

// ─────────────────────────────────────────────────────────────────────────────
// § 1  BETTER AUTH MOCK
//      Must be declared before any import that transitively imports ~/lib/auth.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('~/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Pull the mock reference so individual tests can control the return value.
import { auth } from '~/lib/auth';
const mockGetSession = vi.mocked(auth.api.getSession);

// ─────────────────────────────────────────────────────────────────────────────
// § 2  DRIZZLE MOCK
//
//      Choose ONE of the two patterns below based on how your router queries:
//
//      2a — db.query.*.findMany() / findFirst()  (relational API)
//      2b — db.select().from().where()            (builder API)
//
//      Delete the pattern you are not using.
// ─────────────────────────────────────────────────────────────────────────────

// ── § 2a  Relational API mock ────────────────────────────────────────────────
//
//  Usage in tests:
//    mockDb.query.projects.findMany.mockResolvedValue([{ id: '1', ... }]);
//
let mockDb: {
  query: {
    // Add one entry per Drizzle table your router touches.
    YOUR_TABLE: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

// ── § 2b  Builder API mock ───────────────────────────────────────────────────
//
//  Each method returns the next step in the chain. The LAST awaited method
//  (usually where / limit / returning) returns Promise.resolve(data).
//  Do NOT use .execute() — Drizzle resolves the chain promise directly.
//
//  Usage in tests:
//    mockDb.where.mockResolvedValue([{ id: '1', ... }]);
//
// let mockDb: Record<string, ReturnType<typeof vi.fn>>;

// ─────────────────────────────────────────────────────────────────────────────
// § 3  SHARED SESSION FIXTURE
// ─────────────────────────────────────────────────────────────────────────────

const AUTHED_SESSION = {
  session: {
    id: 'sess_test_123',
    userId: 'usr_test_999',
    expiresAt: new Date(Date.now() + 3_600_000),
  },
  user: {
    id: 'usr_test_999',
    email: 'test@example.com',
    name: 'Test User',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// § 4  beforeEach  — reset all mocks before every test
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();

  // § 2a reset
  mockDb = {
    query: {
      YOUR_TABLE: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    // Default transaction: immediately executes the callback with mockDb as tx
    transaction: vi.fn().mockImplementation((cb: (tx: typeof mockDb) => Promise<unknown>) =>
      cb(mockDb)
    ),
  };

  // § 2b reset (uncomment if using builder API)
  // mockDb = {
  //   select: vi.fn().mockReturnThis(),
  //   from:   vi.fn().mockReturnThis(),
  //   where:  vi.fn(),          // ← terminal; tests set mockResolvedValue here
  //   limit:  vi.fn().mockReturnThis(),
  //   insert: vi.fn().mockReturnThis(),
  //   values: vi.fn().mockReturnThis(),
  //   returning: vi.fn(),       // ← terminal for inserts
  //   update: vi.fn().mockReturnThis(),
  //   set:    vi.fn().mockReturnThis(),
  //   delete: vi.fn().mockReturnThis(),
  // };

  // Default: no active session (tests override per-case as needed)
  mockGetSession.mockResolvedValue(null);
});

// ─────────────────────────────────────────────────────────────────────────────
// § 5  tRPC TESTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper: builds a tRPC context that mirrors your Better Auth middleware injection.
 * Pass `session: null` to simulate an unauthenticated request.
 */
const createTestContext = (sessionOverride: typeof AUTHED_SESSION | null = AUTHED_SESSION) => ({
  db: mockDb as unknown as NodePgDatabase<Record<string, unknown>>,
  session: sessionOverride,
});

const createCaller = createCallerFactory(appRouter);

describe('tRPC · YOUR_ROUTER.YOUR_PROCEDURE', () => {
  // ── Happy path ─────────────────────────────────────────────────────────────
  test('returns data when session is valid and input is correct', async () => {
    // Arrange
    const fixture = [{ id: '1', title: 'Alpha', status: 'active' }];
    // § 2a:
    mockDb.query.YOUR_TABLE.findMany.mockResolvedValue(fixture);
    // § 2b: mockDb.where.mockResolvedValue(fixture);

    const caller = createCaller(createTestContext());

    // Act
    const result = await caller.YOUR_ROUTER.YOUR_PROCEDURE({ status: 'active' });

    // Assert
    expect(result).toEqual(fixture);
    // § 2a: ensure the right table was queried
    expect(mockDb.query.YOUR_TABLE.findMany).toHaveBeenCalledOnce();
  });

  // ── Unauthenticated ────────────────────────────────────────────────────────
  test('throws UNAUTHORIZED when session is null', async () => {
    const caller = createCaller(createTestContext(null));

    const err = await caller.YOUR_ROUTER.YOUR_PROCEDURE({ status: 'active' }).catch(e => e);

    expect(err).toBeInstanceOf(TRPCError);
    expect(err.code).toBe('UNAUTHORIZED');

    // DB must never be touched
    expect(mockDb.query.YOUR_TABLE.findMany).not.toHaveBeenCalled();
  });

  // ── Invalid input (Zod) ────────────────────────────────────────────────────
  test('throws BAD_REQUEST when input fails Zod validation', async () => {
    const caller = createCaller(createTestContext());

    // Pass a value outside the allowed enum / type
    const err = await caller.YOUR_ROUTER.YOUR_PROCEDURE({
      status: 'not_a_real_status' as string,
    }).catch(e => e);

    expect(err).toBeInstanceOf(TRPCError);
    expect(err.code).toBe('BAD_REQUEST');
    expect(mockDb.query.YOUR_TABLE.findMany).not.toHaveBeenCalled();
  });

  // ── Database error ─────────────────────────────────────────────────────────
  test('throws INTERNAL_SERVER_ERROR when the database rejects', async () => {
    mockDb.query.YOUR_TABLE.findMany.mockRejectedValue(new Error('DB connection lost'));

    const caller = createCaller(createTestContext());

    const err = await caller.YOUR_ROUTER.YOUR_PROCEDURE({ status: 'active' }).catch(e => e);

    expect(err).toBeInstanceOf(TRPCError);
    expect(err.code).toBe('INTERNAL_SERVER_ERROR');
    // Confirm the raw DB message is NOT leaked to the client
    expect(err.message).not.toContain('DB connection lost');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// § 6  REST ROUTE HANDLER TESTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal NextRequest factory.
 * Extend headers/body as needed per test case.
 */
const makeRequest = (
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
) => {
  const url = new URL(`http://localhost${path}`);
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });
};

describe('REST · GET /api/YOUR_RESOURCE', () => {
  // ── Happy path ─────────────────────────────────────────────────────────────
  test('200 — returns data when session is valid', async () => {
    // Arrange: authenticated session
    mockGetSession.mockResolvedValue(AUTHED_SESSION);
    // § 2a:
    mockDb.query.YOUR_TABLE.findMany.mockResolvedValue([{ id: '1', title: 'Alpha' }]);

    const req = makeRequest('/api/YOUR_RESOURCE', { searchParams: { status: 'active' } });

    // Act
    const res = await GET(req);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body).toMatchObject([{ id: '1', title: 'Alpha' }]);
  });

  // ── Unauthenticated ────────────────────────────────────────────────────────
  test('401 — returns Unauthorized when session is null', async () => {
    mockGetSession.mockResolvedValue(null); // already the default, explicit for clarity

    const req = makeRequest('/api/YOUR_RESOURCE');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toMatchObject({ error: 'Unauthorized' });
    expect(mockDb.query.YOUR_TABLE.findMany).not.toHaveBeenCalled();
  });

  // ── Invalid input (Zod) ────────────────────────────────────────────────────
  test('400 — returns validation error for bad query params', async () => {
    mockGetSession.mockResolvedValue(AUTHED_SESSION);

    const req = makeRequest('/api/YOUR_RESOURCE', {
      searchParams: { status: 'not_a_real_status' },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(mockDb.query.YOUR_TABLE.findMany).not.toHaveBeenCalled();
  });

  // ── Database error ─────────────────────────────────────────────────────────
  test('500 — returns generic error and does not leak DB internals', async () => {
    mockGetSession.mockResolvedValue(AUTHED_SESSION);
    mockDb.query.YOUR_TABLE.findMany.mockRejectedValue(new Error('column "xyz" does not exist'));

    const req = makeRequest('/api/YOUR_RESOURCE', { searchParams: { status: 'active' } });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal server error');
    // Raw DB error must not reach the client
    expect(JSON.stringify(body)).not.toContain('column "xyz"');
  });
});

describe('REST · POST /api/YOUR_RESOURCE', () => {
  // ── Happy path ─────────────────────────────────────────────────────────────
  test('201 — creates resource and returns it', async () => {
    mockGetSession.mockResolvedValue(AUTHED_SESSION);
    const created = { id: '2', title: 'Beta', status: 'active' };
    // § 2a: mock insert returning
    mockDb.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([created]) }) });

    const req = makeRequest('/api/YOUR_RESOURCE', {
      method: 'POST',
      body: { title: 'Beta', status: 'active' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject(created);
  });

  // ── Unauthenticated ────────────────────────────────────────────────────────
  test('401 — rejects unauthenticated POST', async () => {
    const req = makeRequest('/api/YOUR_RESOURCE', {
      method: 'POST',
      body: { title: 'Beta', status: 'active' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // ── Invalid body (Zod) ────────────────────────────────────────────────────
  test('400 — rejects missing required fields', async () => {
    mockGetSession.mockResolvedValue(AUTHED_SESSION);

    const req = makeRequest('/api/YOUR_RESOURCE', {
      method: 'POST',
      body: { /* title intentionally missing */ status: 'active' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty('details'); // Zod flatten() output
  });
});
