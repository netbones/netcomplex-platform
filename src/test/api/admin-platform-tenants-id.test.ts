/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({}));

const mocks = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  getTenantById: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
  writeAuditLog: vi.fn(),
  logError: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiError: (message = 'Error') =>
      NextResponse.json({ success: false, error: { code: 'ERROR', message } }, { status: 400 }) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 }) as any,
    apiNotFound: (message = 'Not found') =>
      NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message } }, { status: 404 }) as any,
    writeAuditLog: (...args: any[]) => mocks.writeAuditLog(...args),
    auth: { api: { getSession: (...args: any[]) => mocks.getSession(...args) } },
  };
});

vi.mock('@entities/tenant/server', () => ({
  requirePlatformAdmin: (...args: any[]) => mocks.requirePlatformAdmin(...args),
  getTenantById: (...args: any[]) => mocks.getTenantById(...args),
  updateTenant: (...args: any[]) => mocks.updateTenant(...args),
  deleteTenant: (...args: any[]) => mocks.deleteTenant(...args),
}));

vi.mock('@shared/lib', () => ({
  logError: (...args: any[]) => mocks.logError(...args),
}));

import { GET, PATCH, DELETE } from '@/app/api/admin/platform/tenants/[id]/route';

const MOCK_TENANT = {
  id: 'tenant-1',
  name: 'Soralia Village',
  slug: 'soralia',
  customDomain: null,
  logoUrl: 'https://example.com/logo.png',
  faviconUrl: null,
  primaryColor: '#4F46E5',
  accentColor: null,
  secondaryColor: null,
  fontFamily: null,
  customCss: null,
  active: true,
  subscriptionTier: 'foundation',
  tier: 'STANDARD',
  maxPages: 5,
  pageCount: 3,
  featureFlags: { chat: true },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const MOCK_UPDATED_TENANT = {
  ...MOCK_TENANT,
  name: 'Soralia Village Renamed',
  primaryColor: '#22C55E',
  updatedAt: '2026-06-21T00:00:00.000Z',
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options ?? {}) as any;
}

describe('Admin Platform Tenants [id] API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requirePlatformAdmin.mockResolvedValue(null);
    mocks.getTenantById.mockResolvedValue(MOCK_TENANT);
    mocks.updateTenant.mockResolvedValue(MOCK_UPDATED_TENANT);
    mocks.deleteTenant.mockResolvedValue(undefined);
    mocks.getSession.mockResolvedValue({ user: { id: 'admin-1' } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/platform/tenants/[id]', () => {
    it('returns 403 when platform admin guard rejects', async () => {
      mocks.requirePlatformAdmin.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await GET(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1'),
        makeParams('tenant-1')
      );

      expect(res.status).toBe(403);
      expect(mocks.getTenantById).not.toHaveBeenCalled();
    });

    it('returns tenant by id on success', async () => {
      const res = await GET(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1'),
        makeParams('tenant-1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).success).toBe(true);
      expect((body as any).data).toEqual(MOCK_TENANT);
      expect(mocks.getTenantById).toHaveBeenCalledWith('tenant-1');
    });

    it('returns 404 when tenant is not found', async () => {
      mocks.getTenantById.mockResolvedValueOnce(null);

      const res = await GET(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-unknown'),
        makeParams('tenant-unknown')
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect((body as any).success).toBe(false);
      expect((body as any).error.code).toBe('NOT_FOUND');
      expect(mocks.getTenantById).toHaveBeenCalledWith('tenant-unknown');
    });

    it('returns 500 when getTenantById throws', async () => {
      mocks.getTenantById.mockRejectedValueOnce(new Error('DB error'));

      const res = await GET(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1'),
        makeParams('tenant-1')
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
      expect(mocks.logError).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'tenant-api', operation: 'GET' }),
        'Failed to get tenant',
        expect.any(Error)
      );
    });
  });

  describe('PATCH /api/admin/platform/tenants/[id]', () => {
    const updateBody = { name: 'Soralia Village Renamed', primaryColor: '#22C55E' };

    it('returns 403 when platform admin guard rejects', async () => {
      mocks.requirePlatformAdmin.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await PATCH(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
        }),
        makeParams('tenant-1')
      );

      expect(res.status).toBe(403);
      expect(mocks.updateTenant).not.toHaveBeenCalled();
    });

    it('updates and returns the tenant with audit log', async () => {
      const res = await PATCH(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
        }),
        makeParams('tenant-1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).success).toBe(true);
      expect((body as any).data).toEqual(MOCK_UPDATED_TENANT);

      expect(mocks.updateTenant).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          name: 'Soralia Village Renamed',
          primaryColor: '#22C55E',
        })
      );

      expect(mocks.getSession).toHaveBeenCalledOnce();
      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TENANT_UPDATED',
          actorId: 'admin-1',
          targetId: 'tenant-1',
          details: { updatedFields: ['name', 'primaryColor'] },
        })
      );
    });

    it('uses "unknown" actor when session is null', async () => {
      mocks.getSession.mockResolvedValueOnce(null);

      await PATCH(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Renamed' }),
        }),
        makeParams('tenant-1')
      );

      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'unknown' })
      );
    });

    it('passes partial update body through', async () => {
      const partialBody = { slug: 'new-slug', active: false };

      await PATCH(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(partialBody),
        }),
        makeParams('tenant-1')
      );

      expect(mocks.updateTenant).toHaveBeenCalledWith('tenant-1', {
        name: undefined,
        slug: 'new-slug',
        customDomain: undefined,
        logoUrl: undefined,
        faviconUrl: undefined,
        primaryColor: undefined,
        accentColor: undefined,
        secondaryColor: undefined,
        fontFamily: undefined,
        customCss: undefined,
        active: false,
        subscriptionTier: undefined,
        maxPages: undefined,
        featureFlags: undefined,
      });
    });

    it('returns 500 when updateTenant throws', async () => {
      mocks.updateTenant.mockRejectedValueOnce(new Error('Update failed'));

      const res = await PATCH(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
        }),
        makeParams('tenant-1')
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
      expect(mocks.logError).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'tenant-api', operation: 'UPDATE' }),
        'Failed to update tenant',
        expect.any(Error)
      );
    });
  });

  describe('DELETE /api/admin/platform/tenants/[id]', () => {
    it('returns 403 when platform admin guard rejects', async () => {
      mocks.requirePlatformAdmin.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await DELETE(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1', {
          method: 'DELETE',
        }),
        makeParams('tenant-1')
      );

      expect(res.status).toBe(403);
      expect(mocks.deleteTenant).not.toHaveBeenCalled();
    });

    it('deletes the tenant and returns success', async () => {
      const res = await DELETE(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1', {
          method: 'DELETE',
        }),
        makeParams('tenant-1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).success).toBe(true);
      expect((body as any).data).toEqual({ success: true });
      expect(mocks.deleteTenant).toHaveBeenCalledWith('tenant-1');
    });

    it('returns 500 when deleteTenant throws', async () => {
      mocks.deleteTenant.mockRejectedValueOnce(new Error('Delete failed'));

      const res = await DELETE(
        makeRequest('http://localhost/api/admin/platform/tenants/tenant-1', {
          method: 'DELETE',
        }),
        makeParams('tenant-1')
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
      expect(mocks.logError).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'tenant-api', operation: 'DELETE' }),
        'Failed to delete tenant',
        expect.any(Error)
      );
    });
  });
});
