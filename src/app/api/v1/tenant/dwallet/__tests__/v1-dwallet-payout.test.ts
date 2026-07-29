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
  lowBalanceWallet: {
    id: 'wallet-2',
    balance: '20.00',
    lifetimeEarned: '50.00',
    lifetimePaid: '10.00',
    currency: 'ZAR',
    status: 'ACTIVE',
  },
  payouts: [
    {
      id: 'p-1',
      amount: '50.00',
      status: 'COMPLETED',
      method: 'bank_transfer',
      createdAt: new Date('2026-06-20'),
      processedAt: new Date('2026-06-21'),
      notes: null,
    },
  ],
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
  payoutRequests: {
    id: 'id',
    walletId: 'walletId',
    tenantId: 'tenantId',
    amount: 'amount',
    status: 'status',
    method: 'method',
    createdAt: 'createdAt',
    processedAt: 'processedAt',
    notes: 'notes',
  },
  apiSuccess: vi.fn((data: unknown) => jsonResponse({ success: true, data }, 200)),
  apiCreated: vi.fn((data: unknown) => jsonResponse({ success: true, data }, 201)),
  apiError: vi.fn((code: string, msg: string, status: number) =>
    jsonResponse({ error: { code, message: msg } }, status)
  ),
  apiUnauthorized: vi.fn(() => jsonResponse({ error: 'Unauthorized' }, 401)),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  getSessionAndRole: vi.fn(() => Promise.resolve(mocks.sessionResult)),
  guardSuspension: () => null,
  dWallets: {},
  now: vi.fn(() => new Date('2026-06-26T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
  assertModuleEnabled: () => Promise.resolve(null),
}));

vi.mock('@entities/dwallet', () => ({
  payoutRequestSchema: { parse: vi.fn((body: unknown) => body) },
}));

vi.mock('@entities/dwallet/server', () => ({
  getOrCreateWallet: vi.fn(() => Promise.resolve(mocks.wallet)),
}));

import { GET, POST } from '@/app/api/v1/tenant/dwallet/payout/route';

function makeReq(method: string, body?: unknown): Request {
  return new Request('http://localhost:3000/api/v1/tenant/dwallet/payout', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/v1/tenant/dwallet/payout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const response = await GET(makeReq('GET'));
    expect(response.status).toBe(401);
  });

  it('lists payout requests when authenticated', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain(mocks.payouts));

    const response = await GET(makeReq('GET'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe('COMPLETED');
  });

  it('returns empty list when no payouts', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const response = await GET(makeReq('GET'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

describe('POST /api/v1/tenant/dwallet/payout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([{ id: 'payout-new' }]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const response = await POST(makeReq('POST', { amount: 100 }));
    expect(response.status).toBe(401);
  });

  it('creates payout request when balance is sufficient', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([{ id: 'payout-new' }]));

    const response = await POST(makeReq('POST', { amount: 100 }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PENDING');
  });

  it('rejects payout below R50 threshold', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    const { getOrCreateWallet } = await import('@entities/dwallet/index.server');
    vi.mocked(getOrCreateWallet).mockResolvedValueOnce(mocks.lowBalanceWallet as never);

    const response = await POST(makeReq('POST', { amount: 10 }));
    expect(response.status).toBe(400);
  });
});
