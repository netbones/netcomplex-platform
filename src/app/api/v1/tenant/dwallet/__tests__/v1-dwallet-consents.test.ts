import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeInsertChain } from '@/test/api/helpers';

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
  sessionResult: null as { userId: string; user: { id: string } } | null,
  dbMock: { select: vi.fn(), insert: vi.fn() },
  wallet: {
    id: 'wallet-1',
    balance: '150.00',
    lifetimeEarned: '500.00',
    lifetimePaid: '50.00',
    currency: 'ZAR',
    status: 'ACTIVE',
  },
  streams: [
    {
      key: 'stream-1',
      label: 'Data Share',
      description: 'Share anonymous data',
      residentSharePct: 50,
      isActive: true,
    },
    {
      key: 'stream-2',
      label: 'Usage Stats',
      description: 'Share usage statistics',
      residentSharePct: 30,
      isActive: true,
    },
  ],
  consents: [
    {
      streamKey: 'stream-1',
      label: 'Data Share',
      description: 'Share anonymous data',
      granted: true,
      grantedAt: new Date('2026-06-01'),
      revokedAt: null,
    },
  ],
  logger: { info: vi.fn() },
}));

const jsonResponse = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

vi.mock('@/shared/api/auth-utils', () => ({
  requireAuth: vi.fn(async (_request: Request) => {
    if (!mocks.sessionResult) {
      return {
        success: false as const,
        response: new Response(
          JSON.stringify({
            success: false,
            error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        ),
      };
    }
    return {
      success: true as const,
      data: {
        userId: mocks.sessionResult.userId,
        role: 'RESIDENT',
        tenantId: 'test-tenant-id',
        session: { user: { id: mocks.sessionResult.user.id } },
        suspension: null,
      },
    };
  }),
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  auth: { api: { getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)) } },
  dataConsents: {
    id: 'id',
    walletId: 'walletId',
    streamKey: 'streamKey',
    granted: 'granted',
    grantedAt: 'grantedAt',
    revokedAt: 'revokedAt',
    userId: 'userId',
    tenantId: 'tenantId',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
    createdAt: 'createdAt',
  },
  dataRevenueStreams: {
    id: 'id',
    tenantId: 'tenantId',
    key: 'key',
    label: 'label',
    description: 'description',
    isActive: 'isActive',
    residentSharePct: 'residentSharePct',
  },
  apiSuccess: vi.fn((data: unknown) => jsonResponse({ success: true, data }, 200)),
  apiError: vi.fn((code: string, msg: string, status: number) =>
    jsonResponse({ error: { code, message: msg } }, status)
  ),
  apiUnauthorized: vi.fn(() => jsonResponse({ error: 'Unauthorized' }, 401)),
  withErrorHandler: vi.fn(
    (
      handler: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>
    ) => handler as never
  ),
  getSessionAndRole: vi.fn(() => Promise.resolve(mocks.sessionResult)),
  guardSuspension: () => null,
  dWallets: {},
  now: vi.fn(() => new Date('2026-06-26T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
  assertModuleEnabled: () => Promise.resolve(null),
}));

vi.mock('@entities/dwallet/server', () => ({
  getOrCreateWallet: vi.fn(() => Promise.resolve(mocks.wallet)),
  consentSchema: { parse: vi.fn((body: unknown) => body) },
}));

vi.mock('@entities/dwallet', () => ({
  consentSchema: { parse: vi.fn((body: unknown) => body) },
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => mocks.logger,
  createLogger: () => mocks.logger,
}));

describe('GET /api/v1/tenant/dwallet/consents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/v1/tenant/dwallet/consents/route');
    const response = await GET(new Request('http://localhost:3000/api/v1/tenant/dwallet/consents'));
    expect(response.status).toBe(401);
  });

  it('returns consent states for active streams', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    const selectChain = makeSelectChain(mocks.streams);
    const consentThenable = Promise.resolve(mocks.consents);
    const consentRecurse = () => ({
      then: (resolve: (v: unknown[]) => void) => consentThenable.then(resolve),
      limit: () => consentRecurse,
      orderBy: () => consentRecurse,
    });
    selectChain.orderBy = vi.fn(() => ({ ...selectChain, limit: vi.fn(() => consentRecurse) }));
    mocks.dbMock.select.mockReturnValue(selectChain);

    const { GET } = await import('@/app/api/v1/tenant/dwallet/consents/route');
    const response = await GET(new Request('http://localhost:3000/api/v1/tenant/dwallet/consents'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });
});

describe('POST /api/v1/tenant/dwallet/consents/[streamKey]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([{ id: 'consent-new' }]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/v1/tenant/dwallet/consents/[streamKey]/route');
    const response = await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/consents/stream-1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ granted: true }),
      }),
      { params: Promise.resolve({ streamKey: 'stream-1' }) }
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 for unknown stream', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const { POST } = await import('@/app/api/v1/tenant/dwallet/consents/[streamKey]/route');
    const response = await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/consents/unknown', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ granted: true }),
      }),
      { params: Promise.resolve({ streamKey: 'unknown' }) }
    );
    expect(response.status).toBe(404);
  });

  it('records consent when stream exists', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([mocks.streams[0]]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([{ id: 'consent-new' }]));

    const { POST } = await import('@/app/api/v1/tenant/dwallet/consents/[streamKey]/route');
    const response = await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/consents/stream-1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ granted: true }),
      }),
      { params: Promise.resolve({ streamKey: 'stream-1' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.streamKey).toBe('stream-1');
    expect(body.data.granted).toBe(true);
  });

  it('logs consent change via audit logger', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([mocks.streams[0]]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([{ id: 'consent-new' }]));

    const { POST } = await import('@/app/api/v1/tenant/dwallet/consents/[streamKey]/route');
    await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/consents/stream-1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ granted: true }),
      }),
      { params: Promise.resolve({ streamKey: 'stream-1' }) }
    );

    expect(mocks.logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'consent_change', streamKey: 'stream-1', granted: true })
    );
  });
});
