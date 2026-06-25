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
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  authSession: null as { user: { id: string; email?: string; name?: string } } | null,
  userRole: 'RESIDENT',
  walletResult: {
    id: 'wal-1',
    tenantId: 'test-tenant-id',
    userId: 'user-1',
    balance: '100.00',
    currency: 'ZAR',
    lifetimeEarned: '150.00',
    lifetimePaid: '0',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-21T12:00:00Z'),
    updatedAt: new Date('2026-06-21T12:00:00Z'),
  },
  streamResult: [
    {
      id: 'stream-1',
      tenantId: 'test-tenant-id',
      key: 'survey_participation',
      label: 'Survey Participation',
      description: 'Earn rewards',
      residentSharePct: '20.00',
      isActive: true,
      createdAt: new Date('2026-06-21T12:00:00Z'),
      updatedAt: new Date('2026-06-21T12:00:00Z'),
    },
  ],
  consentRows: [] as unknown[],
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.authSession)),
    },
  },
  users: { id: 'id', role: 'role' },
  dataRevenueStreams: {},
  dataConsents: {},
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, msg: string, status: number) =>
      new Response(JSON.stringify({ success: false, error: { code, message: msg } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Unauthorized' },
        }),
        { status: 401 }
      )
  ),
  apiForbidden: vi.fn(
    () =>
      new Response(
        JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
        { status: 403 }
      )
  ),
  withErrorHandler: vi.fn(
    (handler: (req: Request, ctx?: unknown) => Promise<Response>) => handler as never
  ),
  getSessionAndRole: vi.fn(() =>
    Promise.resolve(
      mocks.authSession
        ? {
            session: { user: mocks.authSession.user },
            userId: mocks.authSession.user.id,
            role: mocks.userRole,
            suspension: null,
          }
        : null
    )
  ),
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@entities/dwallet', () => ({
  getOrCreateWallet: vi.fn(() => Promise.resolve(mocks.walletResult)),
  consentSchema: {
    parse: vi.fn((input: unknown) => {
      if (typeof input === 'object' && input !== null && 'granted' in input) {
        return input as { granted: boolean };
      }
      throw new Error('Validation failed');
    }),
  },
}));

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn(() => true),
  createComponentLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Import the route handler under test
import { POST } from '@/app/api/v1/tenant/dwallet/consents/[streamKey]/route';
import { makeSelectChain, makeInsertChain } from '@/test/api/helpers';

describe('Consent API — B-CONSENT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { user: { id: 'user-1', email: 'test@test.com', name: 'Test User' } };
    mocks.userRole = 'RESIDENT';
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.streamResult = [
      {
        id: 'stream-1',
        tenantId: 'test-tenant-id',
        key: 'survey_participation',
        label: 'Survey Participation',
        description: 'Earn rewards',
        residentSharePct: '20.00',
        isActive: true,
        createdAt: new Date('2026-06-21T12:00:00Z'),
        updatedAt: new Date('2026-06-21T12:00:00Z'),
      },
    ];
    mocks.walletResult = {
      id: 'wal-1',
      tenantId: 'test-tenant-id',
      userId: 'user-1',
      balance: '100.00',
      currency: 'ZAR',
      lifetimeEarned: '150.00',
      lifetimePaid: '0',
      status: 'ACTIVE',
      createdAt: new Date('2026-06-21T12:00:00Z'),
      updatedAt: new Date('2026-06-21T12:00:00Z'),
    };
    mocks.consentRows = [];

    // Default: stream lookup returns the mock stream
    mocks.dbMock.select.mockReturnValue(makeSelectChain(mocks.streamResult));
    // Default: insert returns a valid insert chain
    mocks.dbMock.insert = vi.fn(() => makeInsertChain([{}]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates new consent row for stream (granted=true)', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/consents/survey_participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted: true }),
      }),
      { params: { streamKey: 'survey_participation' } }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.granted).toBe(true);
    expect(body.data.streamKey).toBe('survey_participation');
  });

  it('append-only — two consent POSTs create separate rows', async () => {
    // First: check that insert was called
    mocks.dbMock.insert = vi.fn(() => makeInsertChain([{}]));

    await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/consents/survey_participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted: true }),
      }),
      { params: { streamKey: 'survey_participation' } }
    );

    await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/consents/survey_participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted: false }),
      }),
      { params: { streamKey: 'survey_participation' } }
    );

    // Insert should have been called twice (append-only — new rows, not updates)
    expect(mocks.dbMock.insert).toHaveBeenCalledTimes(2);
  });

  it('revokes consent (granted=false) returns correct state', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/consents/survey_participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted: false }),
      }),
      { params: { streamKey: 'survey_participation' } }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.granted).toBe(false);
  });
});
