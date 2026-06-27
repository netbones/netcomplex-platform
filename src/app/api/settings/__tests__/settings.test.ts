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
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  authSession: null as { user: { id: string } } | null,
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  writeAuditLog: vi.fn(),
  requireAssistScopeResult: null as Response | null,
  validateSettingValueResult: { valid: true } as { valid: boolean; error?: string },
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.authSession)),
    },
  },
  db: mocks.dbMock,
  users: { id: 'id', role: 'role' },
  settings: { id: 'id', key: 'key', value: 'value', tenantId: 'tenantId' },
  writeAuditLog: (...args: unknown[]) => mocks.writeAuditLog(...args),
  rateLimitByUser: vi.fn(() => Promise.resolve(null)),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string, status: number = 500) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiForbidden: vi.fn(
    (message = 'Forbidden') =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    (message = 'Unauthorized') =>
      new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  requireAssistScope: vi.fn(() => Promise.resolve(mocks.requireAssistScopeResult)),
}));
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn(() => true),
}));

vi.mock('@shared/lib/settings/validation', () => ({
  validateSettingValue: vi.fn(() => mocks.validateSettingValueResult),
}));

import { GET, POST } from '@/app/api/settings/route';
import { makeSelectChain } from './helpers';

describe('Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { user: { id: 'admin-1' } };
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.requireAssistScopeResult = null;
    mocks.validateSettingValueResult = { valid: true };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('returns all settings for the tenant', async () => {
      const settings = [
        { id: 's1', key: 'site_name', value: 'Soralia', tenantId: 'test-tenant-id' },
        { id: 's2', key: 'theme', value: 'dark', tenantId: 'test-tenant-id' },
      ];
      mocks.dbMock.select.mockReturnValue(makeSelectChain(settings));

      const response = await GET(
        new Request('http://localhost:3000/api/settings') as unknown as Request
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual(settings);
    });

    it('filters a single setting by ?key= query param', async () => {
      const setting = { id: 's1', key: 'site_name', value: 'Soralia', tenantId: 'test-tenant-id' };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([setting]));

      const response = await GET(
        new Request('http://localhost:3000/api/settings?key=site_name') as unknown as Request
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual(setting);
    });

    it('returns null value for missing key filter', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const response = await GET(
        new Request('http://localhost:3000/api/settings?key=nonexistent') as unknown as Request
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual({ key: 'nonexistent', value: null });
    });

    it('returns 403 without auth session', async () => {
      mocks.authSession = null;

      const response = await GET(
        new Request('http://localhost:3000/api/settings') as unknown as Request
      );
      expect(response.status).toBe(403);
    });

    it('returns 403 for non-admin role', async () => {
      const { hasPermission } = await import('@shared/lib');
      vi.mocked(hasPermission).mockReturnValueOnce(false);

      const response = await GET(
        new Request('http://localhost:3000/api/settings') as unknown as Request
      );
      expect(response.status).toBe(403);
    });

    it('returns empty array when no settings exist', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const response = await GET(
        new Request('http://localhost:3000/api/settings') as unknown as Request
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
    });
  });

  describe('POST', () => {
    it('creates a new setting', async () => {
      const created = {
        id: 'site_name',
        key: 'site_name',
        value: 'Soralia',
        tenantId: 'test-tenant-id',
      };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn(() => Promise.resolve([created])),
        }),
      });

      const response = await POST(
        new Request('http://localhost:3000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'site_name', value: 'Soralia' }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual(created);
      expect(mocks.writeAuditLog).toHaveBeenCalledWith({
        action: 'SETTINGS_CHANGED',
        actorId: 'admin-1',
        tenantId: 'test-tenant-id',
        details: { key: 'site_name', oldValue: null, newValue: 'Soralia', method: 'POST' },
      });
    });

    it('updates an existing setting', async () => {
      const existing = {
        id: 'site_name',
        key: 'site_name',
        value: 'Old Name',
        tenantId: 'test-tenant-id',
      };
      const updated = { ...existing, value: 'Soralia' };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([existing]));
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn(() => Promise.resolve([updated])),
          }),
        }),
      });

      const response = await POST(
        new Request('http://localhost:3000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'site_name', value: 'Soralia' }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual(updated);
      expect(mocks.writeAuditLog).toHaveBeenCalledWith({
        action: 'SETTINGS_CHANGED',
        actorId: 'admin-1',
        tenantId: 'test-tenant-id',
        details: { key: 'site_name', oldValue: 'Old Name', newValue: 'Soralia', method: 'POST' },
      });
    });

    it('returns 403 without auth session', async () => {
      mocks.authSession = null;

      const response = await POST(
        new Request('http://localhost:3000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'site_name', value: 'Soralia' }),
        })
      );
      expect(response.status).toBe(403);
    });

    it('returns 403 when requireAssistScope fails', async () => {
      mocks.requireAssistScopeResult = new Response(
        JSON.stringify({ error: 'AssistSession scope restriction' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );

      const response = await POST(
        new Request('http://localhost:3000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'site_name', value: 'Soralia' }),
        })
      );
      expect(response.status).toBe(403);
    });

    it('returns validation error for invalid key/value', async () => {
      mocks.validateSettingValueResult = { valid: false, error: 'Invalid value for setting key' };

      const response = await POST(
        new Request('http://localhost:3000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'page_campaign_enabled', value: 'invalid' }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 429 when rate limited', async () => {
      const { rateLimitByUser } = await import('@api/server');
      vi.mocked(rateLimitByUser).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }) as never
      );

      const response = await POST(
        new Request('http://localhost:3000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'site_name', value: 'Soralia' }),
        })
      );
      expect(response.status).toBe(429);
    });
  });
});
