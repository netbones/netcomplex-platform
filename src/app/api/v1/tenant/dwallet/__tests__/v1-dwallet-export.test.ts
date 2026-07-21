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
  consents: [
    {
      id: 'c-1',
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
      type: 'ALLOCATION',
      amount: '50.00',
      description: 'Data share',
      sourceType: 'RESIDENT_DATA_SHARE',
      balanceBefore: '100.00',
      balanceAfter: '150.00',
      createdAt: new Date('2026-06-26'),
    },
  ],
  payouts: [
    {
      id: 'p-1',
      amount: '50.00',
      status: 'COMPLETED',
      method: 'bank_transfer',
      createdAt: new Date('2026-06-20'),
      processedAt: new Date('2026-06-21'),
    },
  ],
}));

const jsonResponse = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

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
    createdAt: 'createdAt',
    tenantId: 'tenantId',
  },
  walletTransactions: {
    id: 'id',
    walletId: 'walletId',
    type: 'type',
    amount: 'amount',
    description: 'description',
    sourceType: 'sourceType',
    balanceBefore: 'balanceBefore',
    balanceAfter: 'balanceAfter',
    createdAt: 'createdAt',
    tenantId: 'tenantId',
  },
  payoutRequests: {
    id: 'id',
    walletId: 'walletId',
    amount: 'amount',
    status: 'status',
    method: 'method',
    createdAt: 'createdAt',
    processedAt: 'processedAt',
    tenantId: 'tenantId',
  },
  apiSuccess: vi.fn((data: unknown) => jsonResponse({ success: true, data }, 200)),
  apiUnauthorized: vi.fn(() => jsonResponse({ error: 'Unauthorized' }, 401)),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  getSessionAndRole: vi.fn(() => Promise.resolve(mocks.sessionResult)),
  guardSuspension: () => null,
  dWallets: {},
  now: vi.fn(() => new Date('2026-06-26T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@entities/dwallet', () => ({
  getOrCreateWallet: vi.fn(() => Promise.resolve(mocks.wallet)),
  exportRequestSchema: { parse: vi.fn((body: unknown) => body) },
}));

import { POST } from '@/app/api/v1/tenant/dwallet/export/route';

function makeReq(body: unknown): Request {
  return new Request('http://localhost:3000/api/v1/tenant/dwallet/export', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/tenant/dwallet/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;

    const selectChain = makeSelectChain(mocks.consents);
    const orderByChain = { ...selectChain, orderBy: vi.fn(() => makeSelectChain(mocks.consents)) };
    mocks.dbMock.select.mockReturnValue(orderByChain);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const response = await POST(makeReq({ format: 'json' }));
    expect(response.status).toBe(401);
  });

  it('exports JSON format when authenticated', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockImplementationOnce(() => makeSelectChain(mocks.consents))
      .mockImplementationOnce(() => makeSelectChain(mocks.transactions))
      .mockImplementationOnce(() => makeSelectChain(mocks.payouts));

    const response = await POST(makeReq({ format: 'json' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.data.wallet.balance).toBe('150.00');
    expect(body.data.data.consents).toHaveLength(1);
    expect(body.data.data.transactions).toHaveLength(1);
    expect(body.data.data.payouts).toHaveLength(1);
  });

  it('exports CSV format', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockImplementationOnce(() => makeSelectChain(mocks.consents))
      .mockImplementationOnce(() => makeSelectChain(mocks.transactions))
      .mockImplementationOnce(() => makeSelectChain(mocks.payouts));

    const response = await POST(makeReq({ format: 'csv' }));

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(response.headers.get('content-type')).toBe('text/csv');
    expect(text).toContain('id,type,amount,description');
    expect(text).toContain('Data share');
  });
});
