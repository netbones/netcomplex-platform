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
  authSession: { userId: 'user-1', role: 'ADMIN' } as {
    userId: string;
    role: string;
  } | null,
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  writeAuditLog: vi.fn(),
  revalidateAdminChanges: vi.fn(),
  requireAssistScopeResult: null as Response | null,
  validateSettingValueResult: { valid: true } as { valid: boolean; error?: string },
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  settings: { id: 'id', key: 'key', value: 'value', tenantId: 'tenantId' },
  writeAuditLog: (...args: unknown[]) => mocks.writeAuditLog(...args),
  revalidateAdminChanges: (...args: unknown[]) => mocks.revalidateAdminChanges(...args),
  rateLimitByUser: vi.fn(() => Promise.resolve(null)),
  getSessionAndRole: vi.fn(() =>
    Promise.resolve(
      mocks.authSession ? { userId: mocks.authSession.userId, role: mocks.authSession.role } : null
    )
  ),
  notDeleted: vi.fn(() => true),
  guardSuspension: vi.fn(() => null),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
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
  now: vi.fn(() => new Date('2026-06-30T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  assertModuleEnabled: vi.fn(),
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
  withTenantOptional: () =>
    Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
  requireAssistScope: vi.fn(() => Promise.resolve(mocks.requireAssistScopeResult)),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn((role: string) => role === 'ADMIN'),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock('@shared/lib/settings/validation', () => ({
  validateSettingValue: vi.fn(() => mocks.validateSettingValueResult),
}));

import { GET, POST } from '@/app/api/settings/route';

describe('Settings Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { userId: 'user-1', role: 'ADMIN' };
    mocks.requireAssistScopeResult = null;
    mocks.validateSettingValueResult = { valid: true };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/settings — creates setting with audit log + revalidation', () => {
    it('creates a new setting, writes audit log, and revalidates', async () => {
      mocks.dbMock.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'new-id',
              tenantId: 'test-tenant-id',
              key: 'page_chat_enabled',
              value: 'false',
            },
          ]),
        }),
      });

      const req = new Request('http://localhost/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'page_chat_enabled', value: 'false' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SETTINGS_CHANGED',
          actorId: 'user-1',
          tenantId: 'test-tenant-id',
          details: expect.objectContaining({ key: 'page_chat_enabled' }),
        })
      );

      expect(mocks.revalidateAdminChanges).toHaveBeenCalled();
    });

    it('updates existing setting and preserves old value in audit log', async () => {
      mocks.dbMock.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'existing-id',
                tenantId: 'test-tenant-id',
                key: 'page_chat_enabled',
                value: 'true',
              },
            ]),
          }),
        }),
      });
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([{ id: 'existing-id', key: 'page_chat_enabled', value: 'false' }]),
          }),
        }),
      });

      const req = new Request('http://localhost/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'page_chat_enabled', value: 'false' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ oldValue: 'true', newValue: 'false' }),
        })
      );

      expect(mocks.revalidateAdminChanges).toHaveBeenCalled();
    });
  });

  describe('GET /api/settings — filters and returns data', () => {
    it('returns all settings when no key filter', async () => {
      const mockRows = [
        { key: 'page_chat_enabled', value: 'true' },
        { key: 'page_news_enabled', value: 'false' },
      ];
      mocks.dbMock.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockRows),
        }),
      });

      const req = new Request('http://localhost/api/settings', { method: 'GET' });
      const res = await GET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toEqual(mockRows);
    });

    it('filters by key query param', async () => {
      const mockRows = [{ key: 'page_chat_enabled', value: 'true' }];
      mocks.dbMock.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockRows),
          }),
        }),
      });

      const req = new Request('http://localhost/api/settings?key=page_chat_enabled', {
        method: 'GET',
      });
      const res = await GET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toEqual(mockRows[0]);
    });
  });
});
