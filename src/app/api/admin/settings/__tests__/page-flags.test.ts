import { NextRequest } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionAndRole: vi.fn(),
  getRLSContext: vi.fn(),
  runWithRLS: vi.fn(),
  rateLimitByUser: vi.fn(),
  writeAuditLog: vi.fn(),
  hasPermission: vi.fn(),
  getPlatformPageFlagsWithTx: vi.fn(),
  setPlatformPageFlagWithTx: vi.fn(),
  guardSuspension: vi.fn(),
  requireTenantRLS: vi.fn(),
}));

vi.mock('@/shared/api/auth-utils', () => ({
  requireAuth: vi.fn(async (_request: Request, opts?: { permission?: string }) => {
    const session = await mocks.getSessionAndRole();
    if (!session) {
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
    if (opts?.permission && !mocks.hasPermission(session.role, opts.permission)) {
      return {
        success: false as const,
        response: new Response(
          JSON.stringify({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
    return {
      success: true as const,
      data: {
        session: { user: { id: session.userId, email: '', name: '', image: null } },
        userId: session.userId,
        role: session.role,
        suspension: null,
      },
    };
  }),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getSessionAndRole: (...args: any[]) => mocks.getSessionAndRole(...args),
    runWithRLS: (ctx: any, fn: any) => mocks.runWithRLS(ctx, fn),
    getRLSContext: (...args: any[]) => mocks.getRLSContext(...args),
    rateLimitByUser: (...args: any[]) => mocks.rateLimitByUser(...args),
    writeAuditLog: (...args: any[]) => mocks.writeAuditLog(...args),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiError: (code: string, message: string, status: number) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message } },
        { status: 403 }
      ) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
    CACHE_TAGS: { SETTINGS: 'settings' },
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    guardSuspension: (...args: any[]) => mocks.guardSuspension(...args),
    requireTenantRLS: (request: any) => mocks.requireTenantRLS(request),
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@entities/tenant/server', () => ({
  getPlatformPageFlagsWithTx: (...args: any[]) => mocks.getPlatformPageFlagsWithTx(...args),
  setPlatformPageFlagWithTx: (...args: any[]) => mocks.setPlatformPageFlagWithTx(...args),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: any[]) => mocks.hasPermission(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { GET, POST, PUT } from '@/app/api/admin/settings/page-flags/route';

const DEFAULT_RLS_CTX = {
  userId: 'user-1',
  tenantId: 'test-tenant-id',
  role: 'ADMIN',
  isPlatformAdmin: false,
};

const MOCK_FLAGS = {
  campaign: true,
  conservation: true,
  conservationExternalUrl: '',
  chat: true,
  news: true,
  events: true,
  directory: true,
  groups: true,
  services: true,
  resources: true,
  maintenance: true,
  surveys: true,
  competitions: false,
  dashboard: true,
  bookings: true,
  messages: true,
  headerLinks: true,
};

function makeRequest(method: string, body?: unknown): NextRequest {
  const init: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest('http://localhost/api/admin/settings/page-flags', {
    ...init,
    signal: undefined,
  } as any);
}

describe('GET /api/admin/settings/page-flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX });
    mocks.requireTenantRLS.mockImplementation(async (request: any) => {
      const ctx = await mocks.getRLSContext(request);
      if (!ctx) return { ok: false as const, response: new Response('', { status: 401 }) };
      return { ok: true as const, ctx, tenantId: ctx.tenantId };
    });
    mocks.guardSuspension.mockReturnValue(null);
    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => fn({}));
    mocks.getPlatformPageFlagsWithTx.mockResolvedValue(MOCK_FLAGS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without RLS context', async () => {
    mocks.getRLSContext.mockResolvedValue(null);
    const res = await GET(makeRequest('GET'));
    expect(res.status).toBe(401);
  });

  it('returns flags object', async () => {
    const res = await GET(makeRequest('GET'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual(MOCK_FLAGS);
  });

  it('handles error', async () => {
    mocks.getRLSContext.mockRejectedValueOnce(new Error('DB error'));
    const res = await GET(makeRequest('GET'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/admin/settings/page-flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionAndRole.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mocks.hasPermission.mockReturnValue(true);
    mocks.rateLimitByUser.mockResolvedValue(null);
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX });
    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => fn({}));
    mocks.getPlatformPageFlagsWithTx.mockResolvedValue(MOCK_FLAGS);
    mocks.setPlatformPageFlagWithTx.mockResolvedValue(true);
  });

  it('returns 401 without session', async () => {
    mocks.getSessionAndRole.mockResolvedValue(null);
    const res = await POST(makeRequest('POST', { key: 'chat', value: false }));
    expect(res.status).toBe(401);
  });

  it('returns 403 without admin permission', async () => {
    mocks.hasPermission.mockReturnValue(false);
    const res = await POST(makeRequest('POST', { key: 'chat', value: false }));
    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    mocks.rateLimitByUser.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const res = await POST(makeRequest('POST', { key: 'chat', value: false }));
    expect(res.status).toBe(429);
  });

  it('returns 401 without RLS context', async () => {
    mocks.getRLSContext.mockResolvedValue(null);
    const res = await POST(makeRequest('POST', { key: 'chat', value: false }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid key', async () => {
    const res = await POST(makeRequest('POST', { key: 'invalid_key', value: true }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates single flag and writes audit log', async () => {
    const res = await POST(makeRequest('POST', { key: 'chat', value: false }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.success).toBe(true);
    expect(body.data.key).toBe('chat');
    expect(body.data.value).toBe(false);

    expect(mocks.setPlatformPageFlagWithTx).toHaveBeenCalledWith(
      expect.anything(),
      'test-tenant-id',
      'chat',
      false
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith({
      action: 'SETTINGS_CHANGED',
      actorId: 'admin-1',
      tenantId: 'test-tenant-id',
      details: { key: 'chat', oldValue: true, newValue: false, method: 'POST' },
    });
  });

  it('handles error', async () => {
    mocks.runWithRLS.mockRejectedValueOnce(new Error('Transaction failed'));
    const res = await POST(makeRequest('POST', { key: 'chat', value: false }));
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/admin/settings/page-flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionAndRole.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mocks.hasPermission.mockReturnValue(true);
    mocks.rateLimitByUser.mockResolvedValue(null);
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX });
    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => fn({}));
    mocks.getPlatformPageFlagsWithTx.mockResolvedValue(MOCK_FLAGS);
    mocks.setPlatformPageFlagWithTx.mockResolvedValue(true);
  });

  it('returns 401 without session', async () => {
    mocks.getSessionAndRole.mockResolvedValue(null);
    const res = await PUT(makeRequest('PUT', { chat: false }));
    expect(res.status).toBe(401);
  });

  it('batch updates valid keys', async () => {
    const res = await PUT(makeRequest('PUT', { chat: false, news: true, events: false }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results).toHaveLength(3);
    expect(body.data.results.every((r: any) => r.success)).toBe(true);
    expect(mocks.setPlatformPageFlagWithTx).toHaveBeenCalledTimes(3);
    expect(mocks.writeAuditLog).toHaveBeenCalledTimes(3);
  });

  it('reports invalid keys as failures', async () => {
    const res = await PUT(makeRequest('PUT', { chat: false, nonexistent: true }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results).toEqual([
      { key: 'chat', success: true },
      { key: 'nonexistent', success: false },
    ]);
    expect(mocks.setPlatformPageFlagWithTx).toHaveBeenCalledTimes(1);
    expect(mocks.writeAuditLog).toHaveBeenCalledTimes(1);
  });

  it('handles error', async () => {
    mocks.runWithRLS.mockRejectedValueOnce(new Error('Transaction failed'));
    const res = await PUT(makeRequest('PUT', { chat: false }));
    expect(res.status).toBe(500);
  });
});
