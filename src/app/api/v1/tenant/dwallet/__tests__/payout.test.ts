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
  walletResult: null as { id: string; balance: string; [key: string]: unknown } | null,
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/shared/api/auth-utils', () => ({
  requireAuth: vi.fn(async (_request: Request) => {
    if (!mocks.authSession) {
      return {
        success: false as const,
        response: new Response(
          JSON.stringify({
            success: false,
            error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
    return {
      success: true as const,
      data: {
        userId: mocks.authSession.user.id,
        role: mocks.userRole,
        tenantId: 'test-tenant-id',
        session: { user: { id: mocks.authSession.user.id } },
        suspension: null,
      },
    };
  }),
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.authSession)),
    },
  },
  users: { id: 'id', role: 'role' },
  payoutRequests: {},
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiCreated: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 201,
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
  guardSuspension: () => null,
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  dWallets: {},
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@entities/dwallet/server', () => ({
  getOrCreateWallet: vi.fn(() => Promise.resolve(mocks.walletResult)),
  payoutRequestSchema: {
    parse: vi.fn((input: unknown) => {
      if (typeof input === 'object' && input !== null && 'amount' in input) {
        const amount = (input as { amount: number }).amount;
        if (amount < 50) {
          throw new Error('Minimum payout is R50');
        }
        return input as { amount: number };
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
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  })),
}));

import { POST } from '@/app/api/v1/tenant/dwallet/payout/route';
import { makeSelectChain, makeInsertChain } from '@/test/api/helpers';

function createHighBalanceWallet() {
  return {
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
}

function createLowBalanceWallet() {
  return {
    id: 'wal-2',
    tenantId: 'test-tenant-id',
    userId: 'user-1',
    balance: '30.00',
    currency: 'ZAR',
    lifetimeEarned: '30.00',
    lifetimePaid: '0',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-21T12:00:00Z'),
    updatedAt: new Date('2026-06-21T12:00:00Z'),
  };
}

describe('Payout API — B-THRESHOLD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { user: { id: 'user-1', email: 'test@test.com', name: 'Test User' } };
    mocks.userRole = 'RESIDENT';
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.walletResult = createHighBalanceWallet();
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects payout request when balance below R50', async () => {
    mocks.walletResult = createLowBalanceWallet();

    const response = await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 80 }),
      })
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toMatch(/below minimum/i);
  });

  it('accepts payout request when balance meets minimum', async () => {
    mocks.walletResult = createHighBalanceWallet();
    mocks.dbMock.insert = vi.fn(() => makeInsertChain([{}]));

    const response = await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 }),
      })
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.status).toBe('PENDING');
  });

  it('payout does not modify wallet balance', async () => {
    mocks.walletResult = createHighBalanceWallet();
    mocks.dbMock.insert = vi.fn(() => makeInsertChain([{}]));

    // Capture the wallet balance before calling payout
    const balanceBefore = mocks.walletResult.balance;

    await POST(
      new Request('http://localhost:3000/api/v1/tenant/dwallet/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 }),
      })
    );

    // Balance should remain unchanged (debited only on admin COMPLETED)
    expect(mocks.walletResult.balance).toBe(balanceBefore);
  });
});
