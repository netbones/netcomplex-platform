import { NextRequest } from 'next/server';
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
  getServicesConfigWithTx: vi.fn(),
  upsertServicesConfig: vi.fn(),
  defaultServicesConfig: vi.fn(),
  schemaSafeParse: vi.fn(),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  getProviderRegistrationModeImpl: vi.fn(),
  setProviderRegistrationMode: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getSessionAndRole: (...args: unknown[]) => mocks.getSessionAndRole(...args),
    runWithRLS: (ctx: unknown, fn: (...a: unknown[]) => unknown) => mocks.runWithRLS(ctx, fn),
    getRLSContext: (...args: unknown[]) => mocks.getRLSContext(...args),
    rateLimitByUser: (...args: unknown[]) => mocks.rateLimitByUser(...args),
    writeAuditLog: (...args: unknown[]) => mocks.writeAuditLog(...args),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as never,
    apiError: (code: string, message: string, status: number) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as never,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message } },
        { status: 403 }
      ) as never,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as never,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as never,
    apiValidationError: (details: unknown) =>
      NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', details } },
        { status: 422 }
      ) as never,
    CACHE_TAGS: { SETTINGS: 'settings' },
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  };
});

vi.mock('@entities/tenant/server', () => ({
  getPlatformPageFlagsWithTx: (...args: unknown[]) => mocks.getPlatformPageFlagsWithTx(...args),
  setPlatformPageFlagWithTx: (...args: unknown[]) => mocks.setPlatformPageFlagWithTx(...args),
  getServicesConfigWithTx: (...args: unknown[]) => mocks.getServicesConfigWithTx(...args),
  upsertServicesConfig: (...args: unknown[]) => mocks.upsertServicesConfig(...args),
  defaultServicesConfig: (...args: unknown[]) => mocks.defaultServicesConfig(...args),
  servicesConfigSchema: {
    partial: () => ({
      safeParse: (...args: unknown[]) => mocks.schemaSafeParse(...args),
    }),
  },
  getProviderRegistrationModeImpl: (...args: unknown[]) =>
    mocks.getProviderRegistrationModeImpl(...args),
  setProviderRegistrationMode: (...args: unknown[]) => mocks.setProviderRegistrationMode(...args),
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: unknown[]) => mocks.hasPermission(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mocks.revalidateTag(...args),
  revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

vi.mock('@shared/lib/providers', () => ({
  providerRegistrationModeSchema: {
    safeParse: vi.fn((val: unknown) => {
      if (val === 'OPEN' || val === 'INVITATION_ONLY') {
        return { success: true, data: val };
      }
      return { success: false, error: { issues: [{ message: 'Invalid' }] } };
    }),
  },
}));

import { POST as POST_FLAGS, PUT as PUT_FLAGS } from '@/app/api/admin/settings/page-flags/route';
import { PUT as PUT_SERVICES } from '@/app/api/admin/services-config/route';
import { PATCH as PATCH_REG } from '@/app/api/admin/tenant/provider-registration-mode/route';

const DEFAULT_RLS_CTX = {
  userId: 'user-1',
  tenantId: 'test-tenant-id',
  role: 'ADMIN',
  isPlatformAdmin: false,
};

const DEFAULT_FLAGS = {
  campaign: true,
  conservation: 'default',
  conservationExternalUrl: '',
  chat: true,
  education: true,
  news: true,
  events: true,
  directory: true,
  groups: true,
  services: true,
  resources: true,
  maintenance: true,
  surveys: true,
  competitions: true,
  dashboard: true,
  disputes: true,
  dWallet: false,
  providers: true,
  bookings: true,
  marketplacePaypal: false,
  messages: true,
  headerLinks: ['directory', 'groups', 'services', 'resources'],
};

describe('Admin Settings Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' });
    mocks.getRLSContext.mockResolvedValue(DEFAULT_RLS_CTX);
    mocks.rateLimitByUser.mockResolvedValue(null);
    mocks.hasPermission.mockReturnValue(true);
    mocks.runWithRLS.mockImplementation((_ctx: unknown, fn: (...a: unknown[]) => unknown) =>
      fn({ select: vi.fn(), update: vi.fn(), insert: vi.fn() })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/admin/settings/page-flags', () => {
    it('updates flag, writes audit log, and revalidates cache tag', async () => {
      mocks.getPlatformPageFlagsWithTx.mockResolvedValue({
        ...DEFAULT_FLAGS,
        chat: true,
      });
      mocks.setPlatformPageFlagWithTx.mockResolvedValue(true);

      const req = new NextRequest('http://localhost/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: false }),
      });

      const res = await POST_FLAGS(req);
      expect(res.status).toBe(200);

      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SETTINGS_CHANGED',
          actorId: 'user-1',
          tenantId: 'test-tenant-id',
          details: expect.objectContaining({ key: 'chat', oldValue: true, newValue: false }),
        })
      );

      expect(mocks.revalidateTag).toHaveBeenCalledWith('settings');
    });

    it('blocks non-admin with 403', async () => {
      mocks.hasPermission.mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: false }),
      });

      const res = await POST_FLAGS(req);
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/admin/settings/page-flags — batch', () => {
    it('batch updates flags and writes per-change audit logs', async () => {
      mocks.getPlatformPageFlagsWithTx.mockResolvedValue({
        ...DEFAULT_FLAGS,
        chat: true,
        news: false,
      });
      mocks.setPlatformPageFlagWithTx.mockResolvedValue(true);

      const req = new NextRequest('http://localhost/api/admin/settings/page-flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat: false, news: true }),
      });

      const res = await PUT_FLAGS(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.results).toEqual([
        { key: 'chat', success: true },
        { key: 'news', success: true },
      ]);

      expect(mocks.writeAuditLog).toHaveBeenCalledTimes(2);
      expect(mocks.revalidateTag).toHaveBeenCalledWith('settings');
    });
  });

  describe('PUT /api/admin/services-config', () => {
    it('merges partial body, writes audit log, and revalidates', async () => {
      const defaults = {
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
      mocks.defaultServicesConfig.mockReturnValue(defaults);
      mocks.getServicesConfigWithTx.mockResolvedValue(defaults);
      mocks.upsertServicesConfig.mockResolvedValue(true);
      mocks.schemaSafeParse.mockReturnValue({ success: true, data: { heroVisible: false } });

      const req = new NextRequest('http://localhost/api/admin/services-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroVisible: false }),
      });

      const res = await PUT_SERVICES(req);
      expect(res.status).toBe(200);

      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SETTINGS_CHANGED',
          details: expect.objectContaining({
            key: 'services-config',
            oldValue: defaults,
          }),
        })
      );

      expect(mocks.revalidateTag).toHaveBeenCalledWith('settings');
    });
  });

  describe('PATCH /api/admin/tenant/provider-registration-mode', () => {
    it('updates mode, writes audit log, and revalidates cache + path', async () => {
      mocks.getProviderRegistrationModeImpl.mockResolvedValue('INVITATION_ONLY');
      mocks.setProviderRegistrationMode.mockResolvedValue(true);

      const req = new Request('http://localhost/api/admin/tenant/provider-registration-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'OPEN' }),
      });

      const res = await PATCH_REG(req);
      expect(res.status).toBe(200);

      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROVIDER_REGISTRATION_MODE_CHANGED',
          actorId: 'user-1',
          tenantId: 'test-tenant-id',
          details: expect.objectContaining({
            oldValue: 'INVITATION_ONLY',
            newValue: 'OPEN',
          }),
        })
      );

      expect(mocks.revalidateTag).toHaveBeenCalledWith('settings');
      expect(mocks.revalidatePath).toHaveBeenCalledWith('/providers/register');
    });

    it('rate limits excessive requests', async () => {
      mocks.rateLimitByUser.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'RATE_LIMITED', message: 'Too many requests' },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const req = new Request('http://localhost/api/admin/tenant/provider-registration-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'OPEN' }),
      });

      const res = await PATCH_REG(req);
      expect(res.status).toBe(429);

      expect(mocks.setProviderRegistrationMode).not.toHaveBeenCalled();
    });
  });
});
