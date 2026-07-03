/* eslint-disable @typescript-eslint/no-explicit-any */
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
  mockNow: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  mockWithTenant: vi.fn(() => Promise.resolve({ tenantId: 'test-tenant-id' })),
  mockGetPlatformPageFlags: vi.fn(),
  mockGetStatsigExperimentFlags: vi.fn(),
  mockCreateComponentLogger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
  db: { transaction: vi.fn(), select: vi.fn(), update: vi.fn(), insert: vi.fn() },
  mockRateLimitByIP: vi.fn<(...args: unknown[]) => Response | null>(() => null),
  mockVerifyTurnstile: vi.fn<(...args: unknown[]) => Promise<boolean>>(() => Promise.resolve(true)),
  mockFetch: vi.fn<(...args: unknown[]) => Promise<Response>>(),
  mockLogError: vi.fn(),
  mockApiLogger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('@api/server', () => ({
  now: mocks.mockNow,
  db: mocks.db,
  invitations: { id: 'id', token: 'token', status: 'status', expiresAt: 'expiresAt' },
  users: { id: 'id', email: 'email', isActive: 'isActive' },
  apiSuccess: vi.fn(
    (data: unknown, opts?: { status?: number }) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: opts?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string, status = 500) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
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
  apiConflict: vi.fn(
    (message: string) =>
      new Response(JSON.stringify({ success: false, error: { message } }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiForbidden: vi.fn(
    (message: string) =>
      new Response(JSON.stringify({ success: false, error: { message } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiGone: vi.fn(
    (message: string) =>
      new Response(JSON.stringify({ success: false, error: { message } }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiInternalError: vi.fn(
    (message: string) =>
      new Response(JSON.stringify({ success: false, error: { message } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  rateLimitByIP: (...args: unknown[]) => mocks.mockRateLimitByIP(...args) as Response | null,
  rateLimitByKey: (...args: unknown[]) => mocks.mockRateLimitByIP(...args) as Response | null,
  verifyTurnstile: (...args: unknown[]) => mocks.mockVerifyTurnstile(...args) as Promise<boolean>,
  sendEmail: vi.fn(),
  templates: {
    welcome: {
      getHtml: vi.fn(() => '<html></html>'),
      subject: vi.fn(() => 'Welcome!'),
    },
  },
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => mocks.mockWithTenant() as Promise<{ tenantId: string }>,
  getPlatformPageFlagsWithTx: () => mocks.mockGetPlatformPageFlags(),
  getStatsigExperimentFlags: () => mocks.mockGetStatsigExperimentFlags(),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => mocks.mockCreateComponentLogger(),
  logError: (...args: unknown[]) => mocks.mockLogError(...args),
  apiLogger: mocks.mockApiLogger,
}));

vi.mock('varlock/env', () => ({ ENV: {} }));

import { GET as getHealth } from '@/app/api/health/route';
import { GET as getFlags } from '@/app/api/flags/route';
import { POST as postSignup } from '@/app/api/auth/signup/route';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.mockFetch);

  mocks.db.transaction.mockImplementation(async (cb: any) => {
    const tx = { execute: vi.fn(() => Promise.resolve()) };
    return cb(tx);
  });

  mocks.mockGetPlatformPageFlags.mockResolvedValue({
    campaign: true,
    chat: true,
    events: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Health API', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 200 with status ok', async () => {
    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.runtime).toBe('edge');
  });

  it('includes ISO timestamp and version', async () => {
    vi.stubEnv('npm_package_version', '1.2.3');
    const response = await getHealth();
    const body = await response.json();

    expect(body.timestamp).toBe('2026-06-21T12:00:00.000Z');
    expect(body.version).toBe('1.2.3');
    expect(response.headers.get('cache-control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=120'
    );
  });
});

describe('Flags API', () => {
  it('returns all flags when no query params given', async () => {
    const request = Object.assign(new Request('http://localhost:3000/api/flags'), {
      nextUrl: new URL('http://localhost:3000/api/flags'),
    });
    const response = await getFlags(request as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.flags).toEqual({ campaign: true, chat: true, events: true });
    expect(body.data.tenantId).toBe('test-tenant-id');
  });

  it('returns single flag value for valid flag param', async () => {
    const request = Object.assign(new Request('http://localhost:3000/api/flags?flag=campaign'), {
      nextUrl: new URL('http://localhost:3000/api/flags?flag=campaign'),
    });
    const response = await getFlags(request as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.flag).toBe('campaign');
    expect(body.data.value).toBe(true);
  });

  it('returns 400 for invalid flag parameter', async () => {
    const request = Object.assign(new Request('http://localhost:3000/api/flags?flag=invalid'), {
      nextUrl: new URL('http://localhost:3000/api/flags?flag=invalid'),
    });
    const response = await getFlags(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Signup API', () => {
  it('creates user successfully and returns 201', async () => {
    mocks.mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ user: { id: '1', email: 'test@example.com' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Str0ng!Pass',
        name: 'Test User',
      }),
    });

    const response = await postSignup(request as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.user.email).toBe('test@example.com');
    expect(mocks.mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/sign-up/email'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns 400 when required fields are missing', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: 'Str0ng!Pass', name: 'Test User' }),
    });

    const response = await postSignup(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns rate-limited response when IP exceeds limit', async () => {
    mocks.mockRateLimitByIP.mockReturnValue(
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
    );

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Str0ng!Pass',
        name: 'Test User',
      }),
    });

    const response = await postSignup(request as any);

    expect(response.status).toBe(429);
    expect(mocks.mockFetch).not.toHaveBeenCalled();
  });
});
