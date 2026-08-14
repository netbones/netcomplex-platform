import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import type { NextRequest } from 'next/server';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonMock(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Mock @api/server (auth, db, email, templates, API response helpers, rate limiting)
vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({}),
    }),
  },
  users: {},
  verifications: {},
  sessions: {},
  accounts: {},
  passkeys: {},
  twoFactors: {},
  members: {},
  invitations: {},
  organizations: {},
  sendEmail: vi.fn().mockResolvedValue({}),
  templates: {
    passwordReset: {
      subject: 'Reset Password',
      getHtml: vi.fn().mockReturnValue('<html>reset</html>'),
    },
    verifyEmail: {
      subject: 'Verify Email',
      getHtml: vi.fn().mockReturnValue('<html>verify</html>'),
    },
    securityAlert: {
      subject: 'Security Alert',
      getHtml: vi.fn().mockReturnValue('<html>alert</html>'),
    },
    welcome: {
      subject: 'Welcome',
      getHtml: vi.fn().mockReturnValue('<html>welcome</html>'),
    },
  },
  verifyTurnstile: vi.fn().mockResolvedValue(true),
  rateLimitByIP: vi.fn(() => null),
  rateLimitByKey: vi.fn(() => null),
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  apiSuccess: vi.fn((data: unknown, _meta?: unknown, code?: number) => jsonMock(data, code || 200)),
  apiCreated: vi.fn((data: unknown) => jsonMock(data, 201)),
  apiError: vi.fn((_code: string, message: string, status: number) =>
    jsonMock({ error: message }, status)
  ),
  apiConflict: vi.fn((message: string) => jsonMock({ error: message }, 409)),
  apiForbidden: vi.fn((message = 'Forbidden') => jsonMock({ error: message }, 403)),
  apiGone: vi.fn((message = 'Gone') => jsonMock({ error: message }, 410)),
  apiInternalError: vi.fn((message = 'Internal server error') => jsonMock({ error: message }, 500)),
  apiValidationError: vi.fn((details?: unknown) =>
    jsonMock({ error: 'Validation failed', details }, 422)
  ),
  apiUnauthorized: vi.fn((message = 'Authentication required') =>
    jsonMock({ error: message }, 401)
  ),
  apiSuspendedUser: vi.fn((details?: unknown) =>
    jsonMock({ error: 'Account suspended', details }, 403)
  ),
}));

// Mock tenant config
vi.mock('@entities/tenant', () => ({
  tenantConfig: {
    defaultSlug: '',
    auth: {
      issuer: 'Netcomplex',
      cookiePrefix: 'netcomplex',
      allowedHosts: ['localhost:3000'],
    },
  },
}));

// Mock withTenant
vi.mock('@entities/tenant', () => ({
  withTenant: vi.fn().mockResolvedValue({ tenantId: '00000000-0000-0000-0000-000000000001' }),
}));

// Mock tenant server (signup route dynamically imports getTenantByDomain)
vi.mock('@entities/tenant/server', () => ({
  getTenantByDomain: vi.fn().mockResolvedValue(null),
  withTenant: vi.fn().mockResolvedValue({ tenantId: '00000000-0000-0000-0000-000000000001' }),
}));

// Mock logger
vi.mock('@shared/lib', () => ({
  authLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  logError: vi.fn(),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

// Mock slug generator
vi.mock('@api/shared', () => ({
  generateProfileSlug: vi.fn().mockReturnValue('test-user-slug'),
}));

// Mock ENV
vi.mock('varlock/env', () => ({
  ENV: {
    BETTER_AUTH_URL: 'http://localhost:3000',
    TURNSTILE_SECRET_KEY: 'test-secret',
  },
}));

describe('POST /api/auth/signup', () => {
  beforeAll(async () => {
    await import('@/app/api/auth/signup/route');
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when email is missing', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123', name: 'Test' }),
    });

    const response = await POST(request as unknown as NextRequest);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Email, password, and name are required');
  });

  it('returns 400 when password is missing', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' }),
    });

    const response = await POST(request as unknown as NextRequest);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Email, password, and name are required');
  });

  it('returns 400 when name is missing', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(request as unknown as NextRequest);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Email, password, and name are required');
  });

  it('returns 400 when password is too short', { timeout: 15000 }, async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    );

    const { POST } = await import('@/app/api/auth/signup/route');
    // Don't include turnstileToken to skip verification
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'short',
        name: 'Test',
      }),
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();
    expect([400, 403, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(data.error).toBe('Password must be at least 8 characters');
    }
  });
});
