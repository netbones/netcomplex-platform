/**
 * CSOS Export route handler tests.
 * Plan 106-03 — Task 2: JSON event log with rate limiting and audit logging.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mock state ──
const mocks = vi.hoisted(() => ({
  // Auth
  authResult: null as { userId: string; role: string; session: unknown } | null,

  // Tenant
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },

  // Rate limiting
  rateLimitHit: false,

  // Select call counter (1st call = user lookup in getSessionAndRole)
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
    isConfidential: boolean;
    mediationAcceptedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
  } | null,

  // Events
  eventsInDb: Array<{
    id: string;
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    actorId: string;
    note: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }>,

  // Evidence
  evidenceInDb: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
    uploadedBy: string;
    createdAt: Date;
  }>,

  // Insert tracking (for verifying NOTE_ADDED event)
  insertedEvents: [] as Array<Record<string, unknown>>,
}));

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
  const createResponse = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const dbMock = {
    select: vi.fn(() => ({
      from: vi.fn((_table: unknown) => {
        // Drizzle select builder is thenable + has .where()
        const builder = {
          where: vi.fn((_conditions: unknown) => {
            // .where() returns a select builder that is:
            // - thenable (for direct await — evidence query)
            // - has .limit() (dispute query, user query)
            // - has .orderBy() (events query)
            const whereResult = () => {
              mocks.selectCallCounter++;
              if (mocks.selectCallCounter === 1) {
                // First call: user lookup in getSessionAndRole
                return Promise.resolve([
                  {
                    role: mocks.authResult?.role || 'RESIDENT',
                  },
                ]);
              }
              // Default: return evidence data (for queries without .limit/.orderBy)
              return Promise.resolve(mocks.evidenceInDb);
            };

            const limitFn = () => {
              mocks.selectCallCounter++;
              if (mocks.selectCallCounter === 1) {
                // User lookup
                return Promise.resolve([
                  {
                    role: mocks.authResult?.role || 'RESIDENT',
                  },
                ]);
              }
              // Dispute lookup
              return Promise.resolve(mocks.disputeInDb ? [mocks.disputeInDb] : []);
            };

            const orderByFn = () => {
              return Promise.resolve(mocks.eventsInDb);
            };

            // Return a thenable with .limit() and .orderBy()
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
        // .from() is not directly awaited — only .where() is
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
    users: {},
    disputeCases: {},
    disputeEvents: {},
    disputeEvidences: {},

    getSessionAndRole: vi.fn(async () => mocks.authResult),

    rateLimitByKey: vi.fn(async () =>
      mocks.rateLimitHit
        ? createResponse(
            {
              success: false,
              error: { code: 'RATE_LIMITED', message: 'Too many requests' },
            },
            429
          )
        : null
    ),

    apiSuccess: vi.fn((data: unknown) => createResponse({ success: true, data }, 200)),

    apiUnauthorized: vi.fn(() =>
      createResponse(
        {
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        },
        401
      )
    ),

    apiForbidden: vi.fn(() =>
      createResponse(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Forbidden' },
        },
        403
      )
    ),

    apiNotFound: vi.fn(() =>
      createResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404)
    ),

    withErrorHandler: (fn: (...args: unknown[]) => unknown) => fn,
    now: () => new Date(),
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
}));

// ── Helper: create a GET request ──
function createGetRequest(url: string): Request {
  return new Request(url, { method: 'GET' });
}

// ── TASK 2: CSOS Export Route Tests ──

describe('GET /api/disputes/[id]/csos-export — CSOS Form 2 JSON Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authResult = null;
    mocks.rateLimitHit = false;
    mocks.disputeInDb = null;
    mocks.eventsInDb = [];
    mocks.evidenceInDb = [];
    mocks.insertedEvents = [];
    mocks.selectCallCounter = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: 401 without auth ──
  it('returns 401 without auth', async () => {
    mocks.authResult = null;
    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });
    expect(res.status).toBe(401);
  });

  // ── Test 2: 403 for non-owner non-moderator ──
  it('returns 403 for RESIDENT who is not the complainant', async () => {
    mocks.authResult = {
      userId: 'user-other',
      role: 'RESIDENT',
      session: { user: { id: 'user-other' } },
    };
    mocks.disputeInDb = {
      id: 'dispute-1',
      tenantId: 'test-tenant-id',
      complainantId: 'user-complainant',
      respondentId: null,
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
      isConfidential: false,
      mediationAcceptedAt: null,
      deletedAt: null,
      createdAt: new Date('2026-06-01'),
    };
    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });
    expect(res.status).toBe(403);
  });

  // ── Test 3: Returns JSON with all 6 sections ──
  it('returns JSON with all 6 sections (parties, summary, resolutionHistory, evidence, ruling, certification)', async () => {
    mocks.authResult = {
      userId: 'user-complainant',
      role: 'RESIDENT',
      session: { user: { id: 'user-complainant' } },
    };
    mocks.disputeInDb = {
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
      isConfidential: false,
      mediationAcceptedAt: null,
      deletedAt: null,
      createdAt: new Date('2026-06-01'),
    };
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
      {
        id: 'evt-2',
        eventType: 'SUBMITTED',
        fromStatus: 'DRAFT',
        toStatus: 'SUBMITTED',
        actorId: 'user-complainant',
        note: null,
        metadata: null,
        createdAt: new Date('2026-06-02'),
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

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('parties');
    expect(body.data).toHaveProperty('summary');
    expect(body.data).toHaveProperty('resolutionHistory');
    expect(body.data).toHaveProperty('evidence');
    expect(body.data).toHaveProperty('ruling');
    expect(body.data).toHaveProperty('certification');

    // Verify parties section
    expect(body.data.parties).toHaveProperty('complainant');
    expect(body.data.parties).toHaveProperty('respondent');

    // Verify summary section
    expect(body.data.summary).toHaveProperty('referenceNumber');
    expect(body.data.summary).toHaveProperty('title');
    expect(body.data.summary).toHaveProperty('status');

    // Verify ruling section
    expect(body.data.ruling).not.toBeNull();
    expect(body.data.ruling).toHaveProperty('description');
    expect(body.data.ruling).toHaveProperty('issuedAt');

    // Verify certification section
    expect(body.data.certification).toHaveProperty('exportedAt');
    expect(body.data.certification).toHaveProperty('exportedBy');
  });

  // ── Test 4: 429 when 3 exports already used today ──
  it('returns 429 when rate limit exhausted (3 exports/case/day)', async () => {
    mocks.authResult = {
      userId: 'user-complainant',
      role: 'RESIDENT',
      session: { user: { id: 'user-complainant' } },
    };
    mocks.disputeInDb = {
      id: 'dispute-1',
      tenantId: 'test-tenant-id',
      complainantId: 'user-complainant',
      respondentId: null,
      respondentType: 'RESIDENT',
      referenceNumber: 'SRV-2026-0001',
      title: 'Noise complaint',
      description: 'Loud music',
      category: 'NOISE',
      severity: 'MODERATE',
      status: 'FORMAL_RULING',
      submittedAt: new Date('2026-06-01'),
      resolvedAt: null,
      rulingDescription: null,
      rulingIssuedAt: null,
      isConfidential: false,
      mediationAcceptedAt: null,
      deletedAt: null,
      createdAt: new Date('2026-06-01'),
    };
    mocks.rateLimitHit = true;

    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });

    expect(res.status).toBe(429);
  });

  // ── Test 5: Logs NOTE_ADDED DisputeEvent with export metadata ──
  it('logs a NOTE_ADDED DisputeEvent with export metadata', async () => {
    mocks.authResult = {
      userId: 'user-complainant',
      role: 'RESIDENT',
      session: { user: { id: 'user-complainant' } },
    };
    mocks.disputeInDb = {
      id: 'dispute-1',
      tenantId: 'test-tenant-id',
      complainantId: 'user-complainant',
      respondentId: null,
      respondentType: 'RESIDENT',
      referenceNumber: 'SRV-2026-0001',
      title: 'Noise complaint',
      description: 'Loud music',
      category: 'NOISE',
      severity: 'MODERATE',
      status: 'FORMAL_RULING',
      submittedAt: new Date('2026-06-01'),
      resolvedAt: null,
      rulingDescription: null,
      rulingIssuedAt: null,
      isConfidential: false,
      mediationAcceptedAt: null,
      deletedAt: null,
      createdAt: new Date('2026-06-01'),
    };
    mocks.eventsInDb = [];
    mocks.evidenceInDb = [];

    const { GET } = await import('../[id]/csos-export/route');
    const req = createGetRequest('http://localhost/api/disputes/dispute-1/csos-export');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'dispute-1' }),
    } as { params: Promise<{ id: string }> });

    expect(res.status).toBe(200);

    // Verify an insert was made for the NOTE_ADDED event
    expect(mocks.insertedEvents.length).toBeGreaterThanOrEqual(1);
    const exportEvent = mocks.insertedEvents[0];
    expect(exportEvent.eventType).toBe('NOTE_ADDED');
    expect(exportEvent.metadata).toEqual(expect.objectContaining({ exportType: 'CSOS' }));
  });
});
