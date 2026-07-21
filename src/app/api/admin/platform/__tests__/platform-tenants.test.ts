/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({}));

const mocks = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  listTenants: vi.fn(),
  createTenant: vi.fn(),
  writeAuditLog: vi.fn(),
  logError: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiCreated: (data: unknown, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status: 201, ...(init || {}) }) as any,
    apiError: (message = 'Error') =>
      NextResponse.json(
        { success: false, error: { code: 'ERROR', message } },
        { status: 400 }
      ) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
    writeAuditLog: (...args: any[]) => mocks.writeAuditLog(...args),
    auth: { api: { getSession: (...args: any[]) => mocks.getSession(...args) } },
  };
});

vi.mock('@entities/tenant/server', () => ({
  requirePlatformAdmin: (...args: any[]) => mocks.requirePlatformAdmin(...args),
  listTenants: (...args: any[]) => mocks.listTenants(...args),
  createTenant: (...args: any[]) => mocks.createTenant(...args),
}));

vi.mock('@shared/lib', () => ({
  logError: (...args: any[]) => mocks.logError(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { GET, POST } from '@/app/api/admin/platform/tenants/route';

const MOCK_TENANTS = [
  {
    id: 'tenant-1',
    name: 'Soralia Village',
    slug: 'soralia',
    active: true,
    subscriptionTier: 'core',
    tier: 'STANDARD',
    maxPages: 5,
    pageCount: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tenant-2',
    name: 'Oak Heights',
    slug: 'oak-heights',
    active: false,
    subscriptionTier: 'premium',
    tier: 'PREMIUM',
    maxPages: 20,
    pageCount: 0,
    createdAt: '2026-03-15T00:00:00.000Z',
  },
];

const MOCK_CREATED_TENANT = {
  id: 'tenant-3',
  name: 'New Community',
  slug: 'new-community',
  active: true,
  subscriptionTier: 'core',
  tier: 'STANDARD',
  maxPages: 5,
  pageCount: 0,
  primaryColor: '#4F46E5',
  featureFlags: {},
  createdAt: '2026-06-21T00:00:00.000Z',
};

describe('Admin Platform Tenants API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requirePlatformAdmin.mockResolvedValue(null);
    mocks.listTenants.mockResolvedValue(MOCK_TENANTS);
    mocks.createTenant.mockResolvedValue(MOCK_CREATED_TENANT);
    mocks.getSession.mockResolvedValue({ user: { id: 'admin-1' } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/platform/tenants', () => {
    it('returns 403 when platform admin guard rejects', async () => {
      mocks.requirePlatformAdmin.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await GET(new Request('http://localhost/api/admin/platform/tenants') as any);

      expect(res.status).toBe(403);
      expect(mocks.listTenants).not.toHaveBeenCalled();
    });

    it('returns list of tenants on success', async () => {
      const res = await GET(new Request('http://localhost/api/admin/platform/tenants') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).success).toBe(true);
      expect((body as any).data).toEqual(MOCK_TENANTS);
      expect(mocks.listTenants).toHaveBeenCalledOnce();
    });

    it('returns 500 when listTenants throws', async () => {
      mocks.listTenants.mockRejectedValueOnce(new Error('DB error'));

      const res = await GET(new Request('http://localhost/api/admin/platform/tenants') as any);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect((body as any).success).toBe(false);
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
      expect(mocks.logError).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'tenants-api', operation: 'LIST' }),
        'Failed to list tenants',
        expect.any(Error)
      );
    });
  });

  describe('POST /api/admin/platform/tenants', () => {
    const validBody = {
      name: 'New Community',
      slug: 'new-community',
    };

    it('returns 403 when platform admin guard rejects', async () => {
      mocks.requirePlatformAdmin.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await POST(
        new Request('http://localhost/api/admin/platform/tenants', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }) as any
      );

      expect(res.status).toBe(403);
      expect(mocks.createTenant).not.toHaveBeenCalled();
    });

    it('creates tenant and returns 201 with audit log', async () => {
      const res = await POST(
        new Request('http://localhost/api/admin/platform/tenants', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }) as any
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect((body as any).success).toBe(true);
      expect((body as any).data).toEqual(MOCK_CREATED_TENANT);

      expect(mocks.createTenant).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Community',
          slug: 'new-community',
          active: true,
          subscriptionTier: 'core',
          tier: 'STANDARD',
          maxPages: 5,
          pageCount: 0,
          featureFlags: {},
        })
      );

      expect(mocks.getSession).toHaveBeenCalledWith(
        expect.objectContaining({ headers: expect.any(Object) })
      );

      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TENANT_CREATED',
          actorId: 'admin-1',
          targetId: MOCK_CREATED_TENANT.id,
          details: { name: MOCK_CREATED_TENANT.name, slug: MOCK_CREATED_TENANT.slug },
        })
      );
    });

    it('uses "unknown" actor when session is null', async () => {
      mocks.getSession.mockResolvedValueOnce(null);

      await POST(
        new Request('http://localhost/api/admin/platform/tenants', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }) as any
      );

      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'unknown' })
      );
    });

    it('passes optional fields when provided', async () => {
      const fullBody = {
        name: 'Full Config',
        slug: 'full-config',
        customDomain: 'custom.example.com',
        logoUrl: 'https://example.com/logo.png',
        faviconUrl: 'https://example.com/favicon.ico',
        primaryColor: '#FF0000',
        accentColor: '#00FF00',
        secondaryColor: '#0000FF',
        fontFamily: 'Inter',
        customCss: 'body { color: red; }',
        active: false,
        subscriptionTier: 'premium',
        tier: 'PREMIUM',
        maxPages: 50,
        pageCount: 10,
        featureFlags: { chat: true, events: false },
      };

      await POST(
        new Request('http://localhost/api/admin/platform/tenants', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(fullBody),
        }) as any
      );

      expect(mocks.createTenant).toHaveBeenCalledWith(fullBody);
    });

    it('returns 500 when createTenant throws', async () => {
      mocks.createTenant.mockRejectedValueOnce(new Error('Creation failed'));

      const res = await POST(
        new Request('http://localhost/api/admin/platform/tenants', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }) as any
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
      expect(mocks.logError).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'tenants-api', operation: 'CREATE' }),
        'Failed to create tenant',
        expect.any(Error)
      );
    });
  });
});
