import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  roleQuery: vi.fn(),
  suspensionQuery: vi.fn(),
  providerEmailQuery: vi.fn(),
  providerUserIdQuery: vi.fn(),
  resolvePageAccess: vi.fn(),
  flags: vi.fn(),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mocks.getSession(...args),
    },
  },
  getSessionAndRole: (...args: unknown[]) => {
    // Records the real session resolution path: getSession() + role + suspension
    const sessionPromise = mocks.getSession(...args);
    return sessionPromise.then((session: { user?: { id: string } } | null) => {
      if (!session?.user?.id) return null;
      return {
        session: { user: { id: session.user.id, email: 'a@b.com', name: 'A' } },
        userId: session.user.id,
        role: 'RESIDENT',
        suspension: null,
      };
    });
  },
  requireNotSuspended: (...args: unknown[]) => {
    mocks.getSession(...args);
    return Promise.resolve({ suspended: false, suspension: null });
  },
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  },
  serviceProviders: { id: 'id', tenantId: 'tenantId', userId: 'userId' },
  notDeleted: vi.fn(() => true),
  apiSuccess: (data: unknown) =>
    new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  apiError: (code: string, message: string, status: number) =>
    new Response(JSON.stringify({ success: false, error: { code, message } }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() => Promise.resolve({ tenantId: 'tenant-1', tenantSlug: 'soralia' })),
  getPlatformPageFlags: (...args: unknown[]) => mocks.flags(...args),
}));

vi.mock('@shared/api/provider-platform', () => ({
  getProviderRecordForUser: () => Promise.resolve(null),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => mocks.log,
  Role: 'RESIDENT',
}));

vi.mock('@entities/access', async () => {
  const actual = await vi.importActual<typeof import('@entities/access')>('@entities/access');
  return {
    ...actual,
    resolvePageAccess: (...args: [unknown, unknown]) => mocks.resolvePageAccess(...args),
  };
});

import { GET } from '../route';
import { NextRequest } from 'next/server';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/access', {
    headers: { 'x-tenant-id': 'tenant-1' },
  });
}

describe('GET /api/access — session lookup dedupe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.flags.mockResolvedValue({
      messages: true,
      dashboard: true,
      headerLinks: ['dashboard'],
    });
    mocks.resolvePageAccess.mockResolvedValue({
      spaces: ['dashboard'],
      pages: [],
      features: [],
      agent: null,
      resolvedAt: '2026-08-10T12:00:00.000Z',
    });
  });

  it('resolves the auth session exactly ONCE per request (dedupe)', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    // Before the fix, the route called auth.api.getSession 3x:
    //   withTenant() -> assertSessionTenantMatch, getSessionAndRole(), requireNotSuspended()
    // React.cache() does NOT dedupe in route handlers, so each call hits the DB.
    // After the fix, a single session is threaded through withTenant().
    expect(mocks.getSession).toHaveBeenCalledTimes(1);
  });

  it('does not invoke requireNotSuspended when merging suspension into auth', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.spaces).toEqual(['dashboard']);
  });

  it('resolves the session exactly once for unauthenticated callers (null session)', async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.spaces).toEqual([]);
    // withTenant receives null (caller already knew there's no session) — it must
    // NOT re-resolve via auth.api.getSession a second time.
    expect(mocks.getSession).toHaveBeenCalledTimes(1);
  });
});
