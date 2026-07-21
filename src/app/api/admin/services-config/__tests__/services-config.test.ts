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
  getServicesConfigWithTx: vi.fn(),
  upsertServicesConfig: vi.fn(),
  defaultServicesConfig: vi.fn(),
  schemaSafeParse: vi.fn(),
  guardSuspension: vi.fn(),
  requireTenantRLS: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getSessionAndRole: (...args: unknown[]) => mocks.getSessionAndRole(...args),
    runWithRLS: (ctx: any, fn: any) => mocks.runWithRLS(ctx, fn),
    getRLSContext: (...args: unknown[]) => mocks.getRLSContext(...args),
    rateLimitByUser: (...args: any[]) => mocks.rateLimitByUser(...args),
    writeAuditLog: (...args: unknown[]) => mocks.writeAuditLog(...args),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
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
    apiValidationError: (details: unknown) =>
      NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', details } },
        { status: 422 }
      ) as any,
    withErrorHandler: (handler: any) => handler,
    CACHE_TAGS: { SETTINGS: 'settings' },
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    guardSuspension: (...args: unknown[]) => mocks.guardSuspension(...args),
    requireTenantRLS: (request: any) => mocks.requireTenantRLS(request),
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@entities/tenant/server', () => ({
  getServicesConfigWithTx: (...args: unknown[]) => mocks.getServicesConfigWithTx(...args),
  upsertServicesConfig: (...args: unknown[]) => mocks.upsertServicesConfig(...args),
  defaultServicesConfig: (...args: unknown[]) => mocks.defaultServicesConfig(...args),
  servicesConfigSchema: {
    partial: () => ({
      safeParse: (...args: unknown[]) => mocks.schemaSafeParse(...args),
    }),
  },
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: unknown[]) => mocks.hasPermission(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { GET, PUT } from '@/app/api/admin/services-config/route';
import { NextRequest } from 'next/server';

const DEFAULT_RLS_CTX = {
  userId: 'user-1',
  tenantId: 'test-tenant-id',
  role: 'ADMIN',
  isPlatformAdmin: false,
};

const MOCK_DEFAULT_CONFIG = {
  heroVisible: true,
  categoriesVisible: true,
  emergencyVisible: true,
  hoursVisible: true,
  additionalVisible: true,
  directoryCtaVisible: true,
  categories: [],
  emergencyContacts: [],
  hours: [],
  additionalServices: [],
};

function makeRequest(method: 'GET' | 'PUT', body?: unknown): NextRequest {
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
  return new Request('http://localhost/api/admin/services-config', init) as unknown as NextRequest;
}

describe('Admin Services Config API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getSessionAndRole.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX });
    mocks.requireTenantRLS.mockImplementation(async (request: any) => {
      const ctx = await mocks.getRLSContext(request);
      if (!ctx) return { ok: false as const, response: new Response('', { status: 401 }) };
      return { ok: true as const, ctx, tenantId: ctx.tenantId };
    });
    mocks.guardSuspension.mockReturnValue(null);
    mocks.runWithRLS.mockImplementation(async (_ctx: any, fn: any) => fn({}));
    mocks.rateLimitByUser.mockResolvedValue(null);
    mocks.hasPermission.mockReturnValue(true);
    mocks.defaultServicesConfig.mockReturnValue(MOCK_DEFAULT_CONFIG);
    mocks.getServicesConfigWithTx.mockResolvedValue(MOCK_DEFAULT_CONFIG);
    mocks.upsertServicesConfig.mockResolvedValue(true);
    mocks.schemaSafeParse.mockReturnValue({ success: true, data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/services-config', () => {
    it('returns 401 without RLS context', async () => {
      mocks.getRLSContext.mockResolvedValue(null);

      const res = await GET(makeRequest('GET'));

      expect(res.status).toBe(401);
    });

    it('returns the services config from the database', async () => {
      const customConfig = {
        ...MOCK_DEFAULT_CONFIG,
        heroVisible: false,
        categories: [
          {
            id: 'cat-1',
            title: 'Maintenance',
            subtitle: 'Fix things',
            icon: 'wrench',
            items: ['plumbing'],
          },
        ],
      };
      mocks.getServicesConfigWithTx.mockResolvedValue(customConfig);

      const res = await GET(makeRequest('GET'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual(customConfig);
      expect(mocks.getServicesConfigWithTx).toHaveBeenCalledWith(
        expect.anything(),
        'test-tenant-id'
      );
    });

    it('returns 500 when getRLSContext throws', async () => {
      mocks.getRLSContext.mockRejectedValueOnce(new Error('DB error'));

      const res = await GET(makeRequest('GET'));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PUT /api/admin/services-config', () => {
    const validBody = { heroVisible: false, hoursVisible: false };

    it('returns 401 without a session', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const res = await PUT(makeRequest('PUT', validBody));

      expect(res.status).toBe(401);
      expect(mocks.runWithRLS).not.toHaveBeenCalled();
    });

    it('returns 403 when user lacks admin permission', async () => {
      mocks.getSessionAndRole.mockResolvedValue({ userId: 'resident-1', role: 'RESIDENT' });
      mocks.hasPermission.mockReturnValue(false);

      const res = await PUT(makeRequest('PUT', validBody));

      expect(res.status).toBe(403);
      expect(mocks.runWithRLS).not.toHaveBeenCalled();
    });

    it('returns 429 when rate limited', async () => {
      mocks.rateLimitByUser.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await PUT(makeRequest('PUT', validBody));

      expect(res.status).toBe(429);
      expect(mocks.rateLimitByUser).toHaveBeenCalledWith('admin-1', {
        windowMs: 60_000,
        maxRequests: 10,
      });
      expect(mocks.runWithRLS).not.toHaveBeenCalled();
    });

    it('returns 401 when RLS context is missing', async () => {
      mocks.getRLSContext.mockResolvedValue(null);

      const res = await PUT(makeRequest('PUT', validBody));

      expect(res.status).toBe(401);
      expect(mocks.runWithRLS).not.toHaveBeenCalled();
    });

    it('returns 422 when request body fails validation', async () => {
      mocks.schemaSafeParse.mockReturnValueOnce({
        success: false,
        error: {
          flatten: () => ({
            fieldErrors: { heroVisible: ['Expected boolean, received string'] },
          }),
        },
      });

      const res = await PUT(makeRequest('PUT', { heroVisible: 'not-a-boolean' }));

      expect(res.status).toBe(422);
      const body = await res.json();
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
    });

    it('merges partial body with defaults and writes audit log on success', async () => {
      const oldConfig = { ...MOCK_DEFAULT_CONFIG };
      mocks.getServicesConfigWithTx.mockResolvedValue(oldConfig);
      mocks.upsertServicesConfig.mockResolvedValue(true);
      mocks.schemaSafeParse.mockReturnValueOnce({ success: true, data: { heroVisible: false } });

      const res = await PUT(makeRequest('PUT', { heroVisible: false }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({ success: true });

      // Should merge with defaults
      expect(mocks.upsertServicesConfig).toHaveBeenCalledWith(
        expect.anything(),
        'test-tenant-id',
        expect.objectContaining({
          ...MOCK_DEFAULT_CONFIG,
          heroVisible: false,
        })
      );

      // Should audit log
      expect(mocks.writeAuditLog).toHaveBeenCalledWith({
        action: 'SETTINGS_CHANGED',
        actorId: 'admin-1',
        tenantId: 'test-tenant-id',
        details: {
          key: 'services-config',
          oldValue: oldConfig,
          newValue: expect.objectContaining({ ...MOCK_DEFAULT_CONFIG, heroVisible: false }),
          method: 'PUT',
        },
      });
    });

    it('returns 500 when upsert fails', async () => {
      mocks.upsertServicesConfig.mockResolvedValue(false);

      const res = await PUT(makeRequest('PUT', { heroVisible: false }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
    });

    it('returns 500 when runWithRLS throws', async () => {
      mocks.runWithRLS.mockImplementationOnce(async () => {
        throw new Error('Transaction failed');
      });

      const res = await PUT(makeRequest('PUT', { heroVisible: false }));

      expect(res.status).toBe(500);
    });
  });
});
