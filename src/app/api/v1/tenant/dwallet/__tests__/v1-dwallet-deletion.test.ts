import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeInsertChain } from '@/test/api/helpers';

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
  dbMock: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  activeWallet: {
    id: 'wallet-1',
    balance: '150.00',
    lifetimeEarned: '500.00',
    lifetimePaid: '50.00',
    currency: 'ZAR',
    status: 'ACTIVE',
  },
  closedWallet: {
    id: 'wallet-2',
    balance: '0',
    lifetimeEarned: '0',
    lifetimePaid: '0',
    currency: 'ZAR',
    status: 'CLOSED',
  },
  emptyWallet: {
    id: 'wallet-3',
    balance: '0',
    lifetimeEarned: '0',
    lifetimePaid: '0',
    currency: 'ZAR',
    status: 'ACTIVE',
  },
  logger: { info: vi.fn() },
}));

const jsonResponse = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  auth: { api: { getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)) } },
  walletTransactions: {
    id: 'id',
    walletId: 'walletId',
    type: 'type',
    amount: 'amount',
    currency: 'currency',
    description: 'description',
    referenceId: 'referenceId',
    referenceType: 'referenceType',
    balanceBefore: 'balanceBefore',
    balanceAfter: 'balanceAfter',
    sourceType: 'sourceType',
    createdAt: 'createdAt',
    tenantId: 'tenantId',
  },
  dataConsents: { id: 'id', walletId: 'walletId', userId: 'userId', tenantId: 'tenantId' },
  dWallets: {
    id: 'id',
    userId: 'userId',
    tenantId: 'tenantId',
    balance: 'balance',
    status: 'status',
    currency: 'currency',
    lifetimeEarned: 'lifetimeEarned',
    lifetimePaid: 'lifetimePaid',
  },
  apiSuccess: vi.fn((data: unknown) => jsonResponse({ success: true, data }, 200)),
  apiUnauthorized: vi.fn(() => jsonResponse({ error: 'Unauthorized' }, 401)),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  getSessionAndRole: vi.fn(() => Promise.resolve(mocks.sessionResult)),
  guardSuspension: () => null,
  now: vi.fn(() => new Date('2026-06-26T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@entities/dwallet', () => ({
  getOrCreateWallet: vi.fn(() => Promise.resolve(mocks.activeWallet)),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => mocks.logger,
}));

import { POST } from '@/app/api/v1/tenant/dwallet/deletion-request/route';

function makeReq(): Request {
  return new Request('http://localhost:3000/api/v1/tenant/dwallet/deletion-request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  });
}

function makeUpdateChain() {
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({})),
    })),
  };
}

describe('POST /api/v1/tenant/dwallet/deletion-request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([{ id: 'rollover-tx' }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain() as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const response = await POST(makeReq());
    expect(response.status).toBe(401);
  });

  it('closes wallet and sweeps balance when active', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain() as never);

    const response = await POST(makeReq());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('CLOSED');
  });

  it('returns early if wallet already closed', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    const { getOrCreateWallet } = await import('@entities/dwallet/index.server');
    vi.mocked(getOrCreateWallet).mockResolvedValueOnce(mocks.closedWallet as never);

    const response = await POST(makeReq());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('CLOSED');
    expect(body.data.message).toContain('already closed');
  });

  it('does not create rollover transaction for empty wallet', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    const { getOrCreateWallet } = await import('@entities/dwallet/index.server');
    vi.mocked(getOrCreateWallet).mockResolvedValueOnce(mocks.emptyWallet as never);
    mocks.dbMock.update.mockReturnValue(makeUpdateChain() as never);

    await POST(makeReq());

    expect(mocks.dbMock.insert).not.toHaveBeenCalled();
  });

  it('logs deletion event', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.update.mockReturnValue(makeUpdateChain() as never);

    await POST(makeReq());

    expect(mocks.logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'deletion_request', userId: 'user-1' })
    );
  });
});
