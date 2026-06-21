/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from './helpers';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionAndRole: vi.fn(),
  dbMock: { select: vi.fn() },
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    db: mocks.dbMock,
    tenantModules: { id: 'id', tenantId: 'tenantId', moduleKey: 'moduleKey', enabled: 'enabled', config: 'config', enabledAt: 'enabledAt' },
    platformModules: { id: 'id', key: 'key', label: 'label', minTier: 'minTier', defaultEnabled: 'defaultEnabled', description: 'description' },
    tenants: { id: 'id', name: 'name', tier: 'tier', slug: 'slug' },
    eq: (a: unknown, b: unknown) => ({ a, b, op: 'eq' }),
    and: (...args: unknown[]) => ({ args, op: 'and' }),
    desc: (col: unknown) => ({ col, dir: 'desc' }),
    getSessionAndRole: (...args: unknown[]) => mocks.getSessionAndRole(...args),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message } }, { status: 401 }) as any,
    apiNotFound: (message = 'Not found') =>
      NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message } }, { status: 404 }) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 }) as any,
    apiError: () =>
      NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Error' } }, { status: 400 }) as any,
  };
});

vi.mock('@shared/lib', () => ({
  apiLogger: mocks.apiLogger,
}));

import { GET } from '@/app/api/tenants/[id]/modules/route';

const TIERS = { STANDARD: 'STANDARD', PREMIUM: 'PREMIUM', ENTERPRISE: 'ENTERPRISE' } as const;

describe('Tenant Modules API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' });
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/tenants/[id]/modules', () => {
    const params = { params: Promise.resolve({ id: 'tenant-1' }) };

    it('returns 401 without auth', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const res = await GET(new Request('http://localhost/api/tenants/tenant-1/modules'), params);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect((body as any).error.code).toBe('AUTH_REQUIRED');
    });

    it('returns 404 when tenant is not found', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const res = await GET(new Request('http://localhost/api/tenants/tenant-1/modules'), params);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect((body as any).error.code).toBe('NOT_FOUND');
    });

    it('returns enabled modules for PREMIUM tenant', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'tenant-1', name: 'Soralia', tier: TIERS.PREMIUM }]))
        .mockReturnValueOnce(makeSelectChain([
          { key: 'chat', label: 'Chat', minTier: TIERS.STANDARD, defaultEnabled: true, description: null },
          { key: 'analytics', label: 'Analytics', minTier: TIERS.ENTERPRISE, defaultEnabled: false, description: 'Analytics dashboard' },
          { key: 'events', label: 'Events', minTier: TIERS.STANDARD, defaultEnabled: false, description: null },
        ]))
        .mockReturnValueOnce(makeSelectChain([
          { moduleKey: 'chat', enabled: false, config: null, enabledAt: null },
        ]));

      const res = await GET(new Request('http://localhost/api/tenants/tenant-1/modules'), params);
      const body = await res.json();

      expect(res.status).toBe(200);
      // Chat: included (STANDARD <= PREMIUM) but overridden to disabled by tenant module
      expect((body as any).data.chat).toEqual({ enabled: false, config: undefined, enabledAt: undefined });
      // Events: included (STANDARD <= PREMIUM), no tenant module → uses defaultEnabled (false)
      expect((body as any).data.events).toEqual({ enabled: false, config: undefined, enabledAt: undefined });
      // Analytics: excluded (ENTERPRISE > PREMIUM)
      expect((body as any).data.analytics).toBeUndefined();
    });

    it('respects defaultEnabled when no explicit tenant module', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'tenant-1', name: 'Soralia', tier: TIERS.STANDARD }]))
        .mockReturnValueOnce(makeSelectChain([
          { key: 'chat', label: 'Chat', minTier: TIERS.STANDARD, defaultEnabled: true, description: null },
          { key: 'wiki', label: 'Wiki', minTier: TIERS.STANDARD, defaultEnabled: false, description: null },
        ]))
        .mockReturnValueOnce(makeSelectChain([])); // no explicit tenant modules

      const res = await GET(new Request('http://localhost/api/tenants/tenant-1/modules'), params);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.chat.enabled).toBe(true);
      expect((body as any).data.wiki.enabled).toBe(false);
    });

    it('excludes modules above tenant tier', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'tenant-1', name: 'Basic', tier: TIERS.STANDARD }]))
        .mockReturnValueOnce(makeSelectChain([
          { key: 'basic', label: 'Basic', minTier: TIERS.STANDARD, defaultEnabled: true, description: null },
          { key: 'premium_feature', label: 'Premium', minTier: TIERS.PREMIUM, defaultEnabled: true, description: 'Premium only' },
        ]))
        .mockReturnValueOnce(makeSelectChain([]));

      const res = await GET(new Request('http://localhost/api/tenants/tenant-1/modules'), params);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.basic).toBeDefined();
      expect((body as any).data.premium_feature).toBeUndefined();
    });

    it('returns config and enabledAt when present on tenant module', async () => {
      const enabledAt = new Date('2026-06-01T00:00:00.000Z');

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'tenant-1', name: 'Soralia', tier: TIERS.PREMIUM }]))
        .mockReturnValueOnce(makeSelectChain([
          { key: 'chat', label: 'Chat', minTier: TIERS.STANDARD, defaultEnabled: true, description: null },
        ]))
        .mockReturnValueOnce(makeSelectChain([
          { moduleKey: 'chat', enabled: true, config: { slackToken: 'xoxb-xxx' }, enabledAt },
        ]));

      const res = await GET(new Request('http://localhost/api/tenants/tenant-1/modules'), params);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.chat).toEqual({
        enabled: true,
        config: { slackToken: 'xoxb-xxx' },
        enabledAt: enabledAt.toISOString(),
      });
    });

    it('returns 500 on database error and logs the error', async () => {
      mocks.dbMock.select.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      const res = await GET(new Request('http://localhost/api/tenants/tenant-1/modules'), params);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect((body as any).error.code).toBe('INTERNAL_ERROR');
      expect(mocks.apiLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Failed to fetch tenant modules'
      );
    });

    it('returns empty object when no platform modules match tier', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'tenant-1', name: 'Basic', tier: TIERS.STANDARD }]))
        .mockReturnValueOnce(makeSelectChain([
          { key: 'enterprise_only', label: 'Enterprise', minTier: TIERS.ENTERPRISE, defaultEnabled: true, description: null },
        ]))
        .mockReturnValueOnce(makeSelectChain([]));

      const res = await GET(new Request('http://localhost/api/tenants/tenant-1/modules'), params);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({});
    });
  });
});
