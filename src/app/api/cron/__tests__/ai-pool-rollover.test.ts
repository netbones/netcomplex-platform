/**
 * Unit tests for ai-pool-rollover cron route.
 * Phase 109-01 — Task 2
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──
const { mockDb, mockGetTierQuota, mockEnsureOverageInvoiceRecord, mockRecordBillingEvent } =
  vi.hoisted(() => ({
    mockDb: {
      update: vi.fn(),
      select: vi.fn(),
      insert: vi.fn(),
      transaction: vi.fn(),
    },
    mockGetTierQuota: vi.fn(),
    mockEnsureOverageInvoiceRecord: vi.fn(),
    mockRecordBillingEvent: vi.fn(),
  }));

vi.mock('@api/server', () => ({
  db: mockDb,
  tenantAiUsages: {},
  apiSuccess: (data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  apiError: (_code: string, message: string, status: number) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  apiInternalError: (message: string) =>
    new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    }),
  tenants: {},
  ensureOverageInvoiceRecord: (...args: unknown[]) => mockEnsureOverageInvoiceRecord(...args),
  recordBillingEvent: (...args: unknown[]) => mockRecordBillingEvent(...args),
}));

vi.mock('@shared/api/ai/pool', () => ({
  getTierQuota: (...args: unknown[]) => mockGetTierQuota(...args),
}));

vi.mock('@schema/tenant-subscriptions', () => ({
  tenantSubscriptions: {},
}));

// Import after mocks
import { POST } from '../ai-pool-rollover/route';

function makeChainable(result: unknown[]) {
  const p = Promise.resolve(result);
  const recurse = () => chainable;
  const chainable = {
    then: (resolve: (v: unknown[]) => void, reject: (e: Error) => void) => p.then(resolve, reject),
    limit: recurse,
    orderBy: recurse,
    offset: recurse,
    groupBy: recurse,
    returning: () => Promise.resolve(result),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  };
  return chainable;
}

describe('POST /api/cron/ai-pool-rollover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('returns 401 when CRON_SECRET header is missing', async () => {
    const req = new Request('http://localhost/api/cron/ai-pool-rollover', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET header does not match', async () => {
    const req = new Request('http://localhost/api/cron/ai-pool-rollover', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('settles usage and creates no surcharge when no overage', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: () =>
            Promise.resolve([
              {
                id: 'usage-1',
                tenantId: 'tenant-1',
                overageTokens: 0,
                overageCostZAR: '0',
              },
            ]),
        }),
      }),
    });

    const req = new Request('http://localhost/api/cron/ai-pool-rollover', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.surcharged).toEqual([]);
    expect(mockRecordBillingEvent).not.toHaveBeenCalled();
    expect(mockEnsureOverageInvoiceRecord).not.toHaveBeenCalled();
  });

  it('creates billing event and invoice for SURCHARGE overage', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: () =>
            Promise.resolve([
              {
                id: 'usage-1',
                tenantId: 'tenant-depth',
                overageTokens: 5000,
                overageCostZAR: '1.90',
              },
            ]),
        }),
      }),
    });

    mockDb.select.mockReturnValue(
      makeChainable([
        {
          id: 'sub-1',
          tenantId: 'tenant-depth',
          planId: 'plan-depth',
          status: 'ACTIVE',
        },
      ])
    );

    mockGetTierQuota.mockResolvedValue({
      tier: 'ENTERPRISE',
      monthlyTokens: 100000,
      overagePolicy: 'SURCHARGE',
      overagePriceZAR: '0.00038',
    });

    mockRecordBillingEvent.mockResolvedValue('event-1');
    mockEnsureOverageInvoiceRecord.mockResolvedValue({
      id: 'invoice-1',
      invoiceNumber: 'INV-AI-2026-05-tenant-ent',
    });

    const req = new Request('http://localhost/api/cron/ai-pool-rollover', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.surcharged).toHaveLength(1);
    expect(body.surcharged[0].status).toBe('surcharged');
    expect(mockRecordBillingEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'AI_OVERAGE_CHARGED' })
    );
    expect(mockEnsureOverageInvoiceRecord).toHaveBeenCalled();
  });

  it('skips surcharge for HARD_STOP overage policy', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: () =>
            Promise.resolve([
              {
                id: 'usage-2',
                tenantId: 'tenant-standard',
                overageTokens: 3000,
                overageCostZAR: '1.14',
              },
            ]),
        }),
      }),
    });

    mockDb.select.mockReturnValue(
      makeChainable([
        {
          id: 'sub-2',
          tenantId: 'tenant-standard',
          planId: 'plan-standard',
          status: 'ACTIVE',
        },
      ])
    );

    mockGetTierQuota.mockResolvedValue({
      tier: 'STANDARD',
      monthlyTokens: 50000,
      overagePolicy: 'HARD_STOP',
      overagePriceZAR: '0.00001',
    });

    const req = new Request('http://localhost/api/cron/ai-pool-rollover', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.surcharged).toHaveLength(1);
    expect(body.surcharged[0].status).toBe('skipped_policy');
    expect(mockRecordBillingEvent).not.toHaveBeenCalled();
  });
});
