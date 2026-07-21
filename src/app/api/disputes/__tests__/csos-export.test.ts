/**
 * CSOS Export route handler tests.
 * Phase 108-01 — Task 2: Binary PDF response with message queries and DB rate limit fallback.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mock state ──
const mocks = vi.hoisted(() => {
  const data = {
    // Auth
    authResult: null as { userId: string; role: string; session: unknown } | null,

    // Tenant
    tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },

    // Rate limiting — null means Redis unavailable (DB fallback active)
    rateLimitResult: null as Response | null,
    /** When true, rateLimitByKey returns null (Redis unavailable → DB fallback) */
    rateLimitReturnNull: false,

    // Select call counter — used to route different queries
    selectCallCounter: 0,

    // Dispute in DB
    disputeInDb: null as {
      id: string;
      tenantId: string;
      complainantId: string;
      respondentId: string | null;
      respondentType: string;
      referenceNumber: string;
      title: string;
      description: string;
      category: string;
      severity: string;
      status: string;
      submittedAt: Date | null;
      resolvedAt: Date | null;
      rulingDescription: string | null;
      rulingIssuedAt: Date | null;
      desiredOutcome: string | null;
      isConfidential: boolean;
      mediationAcceptedAt: Date | null;
      deletedAt: Date | null;
      createdAt: Date;
    } | null,

    // Events (use const assertion-free references)
    eventsInDb: [] as {
      id: string;
      eventType: string;
      fromStatus: string | null;
      toStatus: string | null;
      actorId: string;
      note: string | null;
      metadata: Record<string, unknown> | null;
      createdAt: Date;
    }[],

    // Evidence
    evidenceInDb: [] as {
      id: string;
      fileName: string;
      fileType: string;
      fileUrl: string;
      uploadedBy: string;
      createdAt: Date;
    }[],

    // Messages
    messagesInDb: [] as {
      id: string;
      senderId: string;
      content: string;
      createdAt: Date;
      editedAt: Date | null;
    }[],

    // Message versions
    messageVersionsInDb: [] as {
      messageId: string;
      originalContent: string;
      editedAt: Date;
    }[],

    // Settings (for tenant CSOS reg)
    settingsInDb: [] as {
      tenantId: string;
      key: string;
      value: string;
    }[],

    // Insert tracking (for verifying NOTE_ADDED event)
    insertedEvents: [] as Record<string, unknown>[],

    // DB fallback: export count today
    dbExportCount: 0,
  };
  return data;
});

// ── server-only mock ──
vi.mock('server-only', () => ({}));

// ── next/headers mock ──
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

// ── @api/server mock ──
vi.mock('@api/server', () => {
  const createJsonResponse = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  // Simulate db.select().from(table)...
  const dbMock = {
    select: vi.fn((columns?: unknown) => ({
      from: vi.fn((_table: unknown) => {
        // Check if this is a count query (DB fallback)
        const isCountQuery =
          columns && typeof columns === 'object' && 'count' in (columns as Record<string, unknown>);

        // Drizzle select builder
        const builder = {
          where: vi.fn((_conditions: unknown) => {
            mocks.selectCallCounter++;

            // If count query, return the export count
            if (isCountQuery) {
              return {
                then: (resolve: (v: unknown) => unknown) =>
                  Promise.resolve([{ count: mocks.dbExportCount }]).then(resolve),
              };
            }

            // Call routing: each .where() increment
            const call = mocks.selectCallCounter;

            // .limit() is for dispute and user lookups
            const limitFn = () => {
              if (call === 1) {
                // User lookup in getSessionAndRole
                return Promise.resolve([{ role: mocks.authResult?.role || 'RESIDENT' }]);
              }
              // Dispute lookup
              return Promise.resolve(mocks.disputeInDb ? [mocks.disputeInDb] : []);
            };

            // .orderBy() is for events, messages, versions
            const orderByFn = () => {
              if (call === 3 || call === 7) {
                return Promise.resolve(mocks.eventsInDb);
              }
              if (call === 4 || call === 8) {
                // Messages query
                return Promise.resolve(mocks.messagesInDb);
              }
              if (call === 5 || call === 9) {
                // Message versions query
                return Promise.resolve(mocks.messageVersionsInDb);
              }
              // Default: evidence data
              return Promise.resolve(mocks.evidenceInDb);
            };

            // Default where (no limit/orderBy) — for evidence, settings, etc.
            const whereResult = () => {
              if (call === 1) {
                return Promise.resolve([{ role: mocks.authResult?.role || 'RESIDENT' }]);
              }
              return Promise.resolve(mocks.evidenceInDb);
            };

            return {
              then: (resolve: (v: unknown) => unknown) => whereResult().then(resolve),
              limit: vi.fn(() => ({
                then: (resolve: (v: unknown) => unknown) => limitFn().then(resolve),
              })),
              orderBy: vi.fn(() => ({
                then: (resolve: (v: unknown) => unknown) => orderByFn().then(resolve),
              })),
            };
          }),
        };
        return builder;
      }),
    })),
    insert: vi.fn((_table: unknown) => ({
      values: vi.fn((values: Record<string, unknown>) => {
        mocks.insertedEvents.push(values);
        return Promise.resolve();
      }),
    })),
  };

  return {
    auth: {
      api: {
        getSession: vi.fn(() => Promise.resolve(mocks.authResult?.session ?? null)),
      },
    },
    db: dbMock,
    now: () => new Date(),

    // Table references (identity objects for Drizzle)
    users: {},
    disputeCases: {},
    disputeEvents: {},
    disputeEvidences: {},
    disputeMessages: {},
    disputeMessageVersions: {},
    settings: {},

    getSessionAndRole: vi.fn(async () => mocks.authResult),
    guardSuspension: vi.fn(() => null),

    rateLimitByKey: vi.fn(async () => {
      if (mocks.rateLimitReturnNull) return null;
      if (mocks.rateLimitResult) return mocks.rateLimitResult;
      return null;
    }),

    apiSuccess: vi.fn((data: unknown) => createJsonResponse({ success: true, data }, 200)),

    apiUnauthorized: vi.fn(() =>
      createJsonResponse(
        {
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        },
        401
      )
    ),

    apiForbidden: vi.fn(() =>
      createJsonResponse(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Forbidden' },
        },
        403
      )
    ),

    apiNotFound: vi.fn(() =>
      createJsonResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } },
        404
      )
    ),

    withErrorHandler: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

// ── @entities/tenant/server mock ──
vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() => Promise.resolve(mocks.tenantResult)),
}));

// ── @shared/lib mock ──
vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn((role: string, perm: string) => {
    if (perm === 'admin') return role === 'ADMIN';
    return false;
  }),
  logError: vi.fn(),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

// ── Helper: create a GET request ──
function createGetRequest(url: string): Request {
  return new Request(url, { method: 'GET' });
}

// ── Helper: minimal dispute data ──
function makeDispute(overrides: Partial<typeof mocks.disputeInDb> = {}) {
  return {
    id: 'dispute-1',
    tenantId: 'test-tenant-id',
    complainantId: 'user-complainant',
    respondentId: 'user-respondent',
    respondentType: 'RESIDENT',
    referenceNumber: 'SRV-2026-0001',
    title: 'Noise complaint',
    description: 'Loud music at night',
    category: 'NOISE',
    severity: 'MODERATE',
    status: 'FORMAL_RULING',
    submittedAt: new Date('2026-06-01'),
    resolvedAt: null,
    rulingDescription: 'Respondent must limit noise after 10pm',
    rulingIssuedAt: new Date('2026-06-15'),
    desiredOutcome: 'Quiet hours enforced.',
    isConfidential: false,
    mediationAcceptedAt: null,
    deletedAt: null,
    createdAt: new Date('2026-06-01'),
    ...overrides,
  };
}

// ── CSOS Export Route Tests ──

describe('GET /api/disputes/[id]/csos-export — CSOS Form 2 PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authResult = null;
    mocks.rateLimitResult = null;
    mocks.rateLimitReturnNull = false;
    mocks.disputeInDb = null;
    mocks.eventsInDb = [];
    mocks.evidenceInDb = [];
    mocks.messagesInDb = [];
    mocks.messageVersionsInDb = [];
    mocks.settingsInDb = [];
    mocks.insertedEvents = [];
    mocks.dbExportCount = 0;
    mocks.selectCallCounter = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Test: 401 without auth ──
  it('returns 401 without auth', async () => {
    mocks.authResult = null;
    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });
    expect(res.status).toBe(401);
  });

  // ── Test: 403 for non-owner non-moderator ──
  it('returns 403 for RESIDENT who is not the complainant', async () => {
    mocks.authResult = {
      userId: 'user-other',
      role: 'RESIDENT',
      session: { user: { id: 'user-other' } },
    };
    mocks.disputeInDb = makeDispute({ complainantId: 'user-complainant' });

    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });
    expect(res.status).toBe(403);
  });

  // ── Test: 429 when rate limit exhausted (Redis) ──
  it('returns 429 when rate limit exhausted (3 exports/case/day)', async () => {
    mocks.authResult = {
      userId: 'user-complainant',
      role: 'RESIDENT',
      session: { user: { id: 'user-complainant' } },
    };
    mocks.disputeInDb = makeDispute();
    mocks.rateLimitResult = new Response(
      JSON.stringify({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );

    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });
    expect(res.status).toBe(429);
  });

  // ── Test: Returns PDF with Content-Type: application/pdf ──
  it('returns 200 with Content-Type: application/pdf', async () => {
    mocks.authResult = {
      userId: 'user-complainant',
      role: 'RESIDENT',
      session: { user: { id: 'user-complainant' } },
    };
    mocks.disputeInDb = makeDispute();
    mocks.eventsInDb = [
      {
        id: 'evt-1',
        eventType: 'CREATED',
        fromStatus: null,
        toStatus: 'DRAFT',
        actorId: 'user-complainant',
        note: null,
        metadata: null,
        createdAt: new Date('2026-06-01'),
      },
    ];
    mocks.evidenceInDb = [
      {
        id: 'ev-1',
        fileName: 'noise-log.pdf',
        fileType: 'application/pdf',
        fileUrl: 'https://s3.example.com/noise-log.pdf',
        uploadedBy: 'user-complainant',
        createdAt: new Date('2026-06-02'),
      },
    ];

    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  // ── Test: Content-Disposition header ──
  it('includes Content-Disposition attachment header with proper filename', async () => {
    mocks.authResult = {
      userId: 'user-complainant',
      role: 'RESIDENT',
      session: { user: { id: 'user-complainant' } },
    };
    mocks.disputeInDb = makeDispute({ referenceNumber: 'SRV-2026-0001' });
    mocks.eventsInDb = [];
    mocks.evidenceInDb = [];

    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });

    const disposition = res.headers.get('Content-Disposition');
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('csos-export-SRV-2026-0001.pdf');
  });

  // ── Test: Response body is non-empty binary with PDF header ──
  it('response body is non-empty binary with PDF header', async () => {
    mocks.authResult = {
      userId: 'user-complainant',
      role: 'RESIDENT',
      session: { user: { id: 'user-complainant' } },
    };
    mocks.disputeInDb = makeDispute();
    mocks.eventsInDb = [];
    mocks.evidenceInDb = [];

    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });

    expect(res.status).toBe(200);
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);

    // Check PDF header bytes: "%PDF-"
    const bytes = new Uint8Array(buffer);
    const header = String.fromCharCode(...bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  // ── Test: Audit log uses metadata.action = 'csos_export' ──
  it('logs a NOTE_ADDED DisputeEvent with metadata.action = csos_export', async () => {
    mocks.authResult = {
      userId: 'user-complainant',
      role: 'RESIDENT',
      session: { user: { id: 'user-complainant' } },
    };
    mocks.disputeInDb = makeDispute();
    mocks.eventsInDb = [];
    mocks.evidenceInDb = [];

    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });

    expect(res.status).toBe(200);

    expect(mocks.insertedEvents.length).toBeGreaterThanOrEqual(1);
    const exportEvent = mocks.insertedEvents[0];
    expect(exportEvent.eventType).toBe('NOTE_ADDED');
    expect(exportEvent.metadata).toEqual(expect.objectContaining({ action: 'csos_export' }));
  });

  // ── Test: DB rate limit fallback returns 429 when Redis unavailable ──
  it('uses DB-based rate limiting fallback when Redis unavailable and 3+ exports logged', async () => {
    mocks.authResult = {
      userId: 'user-complainant',
      role: 'RESIDENT',
      session: { user: { id: 'user-complainant' } },
    };
    mocks.disputeInDb = makeDispute();
    mocks.eventsInDb = [];
    mocks.evidenceInDb = [];

    // Simulate Redis unavailable → rate limit returns null
    mocks.rateLimitReturnNull = true;

    // Simulate 3+ exports already logged today
    mocks.dbExportCount = 3;

    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });

    expect(res.status).toBe(429);
  });
});
