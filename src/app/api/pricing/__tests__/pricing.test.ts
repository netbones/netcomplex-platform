import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  TIERS: {
    core: { id: 'core', name: 'CORE', maxPages: 5, color: '#22C55E' },
    foundation: { id: 'foundation', name: 'FOUNDATION', maxPages: 15, color: '#F59E0B' },
    'pro-max': { id: 'pro-max', name: 'ENTERPRISE', maxPages: -1, color: '#1E293B' },
  },
  rateCard: [
    {
      seatType: 'STANDARD',
      name: 'Standard (≥60 homes)',
      price: 12.5,
      priceLabel: 'R12.50',
      multiplier: 1,
      minimumHomes: 60,
      interval: 'MONTHLY',
      currency: 'ZAR',
      isActive: true,
    },
    {
      seatType: 'STANDARD',
      name: 'Standard (<60 homes)',
      price: 15,
      priceLabel: 'R15.00',
      multiplier: 1,
      minimumHomes: 0,
      interval: 'MONTHLY',
      currency: 'ZAR',
      isActive: true,
    },
    {
      seatType: 'SOLO',
      name: 'Solo Seat',
      price: 12.5,
      priceLabel: 'R12.50',
      multiplier: 1,
      minimumHomes: null,
      interval: 'MONTHLY',
      currency: 'ZAR',
      isActive: true,
    },
    {
      seatType: 'PREMIUM',
      name: 'Premium Seat',
      price: 18.75,
      priceLabel: 'R18.75',
      multiplier: 1.5,
      minimumHomes: null,
      interval: 'MONTHLY',
      currency: 'ZAR',
      isActive: true,
    },
  ],
}));

vi.mock('@api/server', () => ({
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiInternalError: vi.fn(
    (message: string) =>
      new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  db: {},
}));

vi.mock('@entities/tenant/server', () => ({
  withTenantOptional: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@entities/tenant', () => ({
  TIERS: mocks.TIERS,
}));

vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock('@shared/lib/billing/seat-rate-card', () => ({
  getSeatRateCard: vi.fn(() => Promise.resolve(mocks.rateCard)),
}));

import { GET } from '@/app/api/pricing/route';

describe('Pricing API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns all three tier plans with per-household pricing derived from the rate card', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.plans).toHaveLength(3);

    const planIds = body.data.plans.map((p: { id: string }) => p.id);
    expect(planIds).toEqual(['core', 'foundation', 'pro-max']);

    expect(body.data.tiers).toEqual(mocks.TIERS);
  });

  it('prices every tier from the flagship seat rate (R12.50/household)', async () => {
    const response = await GET();
    const body = await response.json();

    for (const plan of body.data.plans as Array<{
      price: string;
      period: string;
      features: string[];
    }>) {
      expect(plan.price).toBe('R12.50');
      expect(plan.period).toBe('/household/mo');
      expect(Array.isArray(plan.features)).toBe(true);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('resolves D1 — no stale flat-tier ZAR literals (R299/R599/Custom)', async () => {
    const response = await GET();
    const body = await response.json();

    const prices = (body.data.plans as Array<{ price: string }>).map(p => p.price);
    expect(prices).not.toContain('R299');
    expect(prices).not.toContain('R599');
    expect(prices).not.toContain('Custom');
  });

  it('keeps per-tier presentation metadata intact', async () => {
    const response = await GET();
    const body = await response.json();

    const foundation = body.data.plans.find((p: { id: string }) => p.id === 'foundation');
    expect(foundation).toBeDefined();
    expect(foundation.name).toBe('Foundation');
    expect(foundation.maxPages).toBe(15);
    expect(foundation.popular).toBe(true);
    expect(foundation.features).toContain('Facility bookings');
  });

  it('passes tenant auth check', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.plans).toHaveLength(3);
  });
});
