/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  mockWithTenant: vi.fn(() => Promise.resolve({ tenantId: 'test-tenant-id' })),
  mockGetPlatformPageFlags: vi.fn(),
  mockGetStatsigExperimentFlags: vi.fn(),
  mockCreateComponentLogger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
  db: { transaction: vi.fn() },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    db: mocks.db,
    apiSuccess: (data: unknown, opts?: { status?: number }) =>
      NextResponse.json({ success: true, data }, { status: opts?.status ?? 200 }) as any,
    apiError: (code: string, message: string, status = 500) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => mocks.mockWithTenant(),
  getPlatformPageFlagsWithTx: () => mocks.mockGetPlatformPageFlags(),
  getStatsigExperimentFlags: () => mocks.mockGetStatsigExperimentFlags(),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => mocks.mockCreateComponentLogger(),
}));

import { GET } from '@/app/api/flags/route';

/**
 * Create a flags request with nextUrl attached for NextRequest compatibility.
 */
function makeFlagsRequest(url: string): Request {
  const req = new Request(url);
  Object.defineProperty(req, 'nextUrl', {
    value: new URL(url),
    writable: false,
    configurable: true,
  });
  return req;
}

describe('Flags API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.db.transaction.mockImplementation(async (cb: any) => {
      const tx = { execute: vi.fn(() => Promise.resolve()) };
      return cb(tx);
    });

    mocks.mockGetPlatformPageFlags.mockResolvedValue({
      campaign: true,
      chat: true,
      events: true,
      news: true,
    });

    mocks.mockGetStatsigExperimentFlags.mockResolvedValue({
      exp_home_redesign: 'variant_a',
      exp_chat_ai: 'control',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns all flags when no query params given', async () => {
    const res = await GET(makeFlagsRequest('http://localhost:3000/api/flags') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.flags).toEqual({
      campaign: true,
      chat: true,
      events: true,
      news: true,
    });
    expect(body.data.tenantId).toBe('test-tenant-id');
  });

  it('returns single flag value for valid flag param', async () => {
    const res = await GET(makeFlagsRequest('http://localhost:3000/api/flags?flag=campaign') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.flag).toBe('campaign');
    expect(body.data.value).toBe(true);
    expect(body.data.tenantId).toBe('test-tenant-id');
  });

  it('returns 400 for invalid flag parameter', async () => {
    const res = await GET(
      makeFlagsRequest('http://localhost:3000/api/flags?flag=invalid_flag') as any
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns experiment flags when experiments=true', async () => {
    const res = await GET(
      makeFlagsRequest('http://localhost:3000/api/flags?experiments=true') as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.experiments).toEqual({
      exp_home_redesign: 'variant_a',
      exp_chat_ai: 'control',
    });
    expect(body.data.tenantId).toBe('test-tenant-id');
  });

  it('prioritizes flag param when both flag and experiments are provided', async () => {
    const res = await GET(
      makeFlagsRequest('http://localhost:3000/api/flags?flag=chat&experiments=true') as any
    );
    const body = await res.json();

    // flag param is checked before experiments, so it returns single flag
    expect(res.status).toBe(200);
    expect(body.data.flag).toBe('chat');
    expect(body.data.value).toBe(true);
    expect(body.data.experiments).toBeUndefined();
  });

  it('ignores unrecognized query params and returns all flags', async () => {
    const res = await GET(makeFlagsRequest('http://localhost:3000/api/flags?unknown=param') as any);
    const body = await res.json();

    // Unknown params are ignored; since no flag/experiments param is set,
    // the route falls through to the "all flags" branch
    expect(res.status).toBe(200);
    expect(body.data.flags).toBeDefined();
    expect(body.data.tenantId).toBe('test-tenant-id');
  });

  it('returns 400 for experiments=false (not "true")', async () => {
    const res = await GET(
      makeFlagsRequest('http://localhost:3000/api/flags?experiments=false') as any
    );
    const body = await res.json();

    // experiments=false does not match === 'true', falls through to fallback
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('handles flag fetch error gracefully', async () => {
    mocks.mockGetPlatformPageFlags.mockRejectedValue(new Error('DB connection failed'));

    const res = await GET(makeFlagsRequest('http://localhost:3000/api/flags') as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.data.error).toBe('Failed to evaluate flags');
    expect(body.data.detail).toContain('DB connection failed');
  });

  it('handles experiments fetch error gracefully', async () => {
    mocks.mockGetStatsigExperimentFlags.mockRejectedValue(new Error('Statsig timeout'));

    const res = await GET(
      makeFlagsRequest('http://localhost:3000/api/flags?experiments=true') as any
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.data.error).toBe('Failed to evaluate flags');
    expect(body.data.detail).toContain('Statsig timeout');
  });
});
