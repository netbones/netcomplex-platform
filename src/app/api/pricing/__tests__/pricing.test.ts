import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  TIERS: {
    core: { id: 'core', name: 'CORE', maxPages: 5, color: '#22C55E' },
    foundation: { id: 'foundation', name: 'FOUNDATION', maxPages: 15, color: '#F59E0B' },
    'pro-max': { id: 'pro-max', name: 'ENTERPRISE', maxPages: -1, color: '#1E293B' },
  },
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
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@entities/tenant', () => ({
  TIERS: mocks.TIERS,
}));

vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
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

  it('returns all three pricing plans with tiers', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.plans).toHaveLength(3);

    const planIds = body.data.plans.map((p: { id: string }) => p.id);
    expect(planIds).toEqual(['core', 'foundation', 'pro-max']);

    expect(body.data.tiers).toEqual(mocks.TIERS);

    const foundation = body.data.plans.find((p: { id: string }) => p.id === 'foundation');
    expect(foundation).toBeDefined();
    expect(foundation.price).toBe('R599');
    expect(foundation.popular).toBe(true);
  });

  it('returns correct pricing data for core tier', async () => {
    const response = await GET();
    const body = await response.json();

    const foundation = body.data.plans.find((p: { id: string }) => p.id === 'core');
    expect(foundation.name).toBe('FOUNDATION');
    expect(foundation.price).toBe('R299');
    expect(foundation.period).toBe('/month');
    expect(foundation.maxPages).toBe(5);
    expect(foundation.popular).toBe(false);
    expect(foundation.features).toContain('Up to 5 pages');
    expect(foundation.features).toContain('Email support');
  });

  it('returns correct pricing data for pro-max tier', async () => {
    const response = await GET();
    const body = await response.json();

    const core = body.data.plans.find((p: { id: string }) => p.id === 'pro-max');
    expect(core.name).toBe('CORE');
    expect(core.price).toBe('Custom');
    expect(core.period).toBe('');
    expect(core.maxPages).toBe(-1);
    expect(core.popular).toBe(false);
    expect(core.cta).toBe('Contact Sales');
  });

  it('passes tenant auth check', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.plans).toHaveLength(3);
  });
});
