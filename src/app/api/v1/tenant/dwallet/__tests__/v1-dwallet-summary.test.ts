import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

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
  dbMock: { select: vi.fn() },
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
      isActive: true,
      id: 's-1',
      residentSharePct: 50,
      createdAt: new Date('2026-01-01'),
    },
  ],
  consents: [
    {
      id: 'consent-1',
      walletId: 'wallet-1',
      streamKey: 'stream-1',
      granted: true,
      grantedAt: new Date('2026-06-01'),
      revokedAt: null,
      createdAt: new Date('2026-06-01'),
    },
  ],
  transactions: [
    {
      id: 'tx-1',
      walletId: 'wallet-1',
      tenantId: 'test-tenant-id',
      type: 'ALLOCATION',
      amount: '50.00',
      description: 'Test allocation',
      sourceType: 'RESIDENT_DATA_SHARE',
      balanceBefore: '100.00',
      balanceAfter: '150.00',
      createdAt: new Date('2026-06-26'),
    },
  ],
}));

const jsonResponse = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  auth: { api: { getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)) } },
  walletTransactions: {
    id: 'id',
    walletId: 'walletId',
    tenantId: 'tenantId',
    type: 'type',
    amount: 'amount',
    description: 'description',
    sourceType: 'sourceType',
    balanceBefore: 'balanceBefore',
    balanceAfter: 'balanceAfter',
    createdAt: 'createdAt',
  },
  dataConsents: {
    id: 'id',
    walletId: 'walletId',
    streamKey: 'streamKey',
    granted: 'granted',
    grantedAt: 'grantedAt',
    revokedAt: 'revokedAt',
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
  apiUnauthorized: vi.fn(() => jsonResponse({ error: 'Unauthorized' }, 401)),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  getSessionAndRole: vi.fn(() => Promise.resolve(mocks.sessionResult)),
  now: vi.fn(() => new Date('2026-06-26T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@entities/dwallet', () => ({
  getOrCreateWallet: vi.fn(() => Promise.resolve(mocks.wallet)),
}));

import { GET } from '@/app/api/v1/tenant/dwallet/route';

function makeReq(url = 'http://localhost:3000/api/v1/tenant/dwallet'): Request {
  return new Request(url, {
    headers: { 'content-type': 'application/json' },
  });
}

describe('GET /api/v1/tenant/dwallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const response = await GET(makeReq());
    expect(response.status).toBe(401);
  });

  it('returns dwallet summary when authenticated', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    // First select call returns streams, subsequent calls return transactions
    mocks.dbMock.select
      .mockImplementationOnce(() => makeSelectChain(mocks.streams))
      .mockReturnValue(makeSelectChain(mocks.transactions));

    const response = await GET(makeReq());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.balance).toBe('150.00');
    expect(body.data.lifetimeEarned).toBe('500.00');
    expect(body.data.lifetimePaid).toBe('50.00');
    expect(body.data.currency).toBe('ZAR');
    expect(body.data.status).toBe('ACTIVE');
    expect(body.data.recentTransactions).toHaveLength(1);
  });

  it('returns empty consents when no streams exist', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const response = await GET(makeReq());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.consents).toEqual([]);
  });

  it('includes recent transactions in summary', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain(mocks.transactions));

    const response = await GET(makeReq());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.recentTransactions).toBeDefined();
  });
});
