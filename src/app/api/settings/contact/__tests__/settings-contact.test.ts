/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from './helpers';

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
  getSessionAndRole: vi.fn(),
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  tenantOptionalResult: { tenantId: 'test-tenant-id' as string | null },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    db: mocks.dbMock,
    settings: { id: 'id', key: 'key', value: 'value', tenantId: 'tenantId' },
    getSessionAndRole: (...args: unknown[]) => mocks.getSessionAndRole(...args),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiError: (code: string, message: string, status = 500) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
    withErrorHandler: (handler: any) => handler,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
  withTenantOptional: () => Promise.resolve(mocks.tenantOptionalResult),
}));

vi.mock('@shared/lib', () => ({}));

import { GET, POST } from '@/app/api/settings/contact/route';

describe('Settings Contact API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' });
    mocks.tenantOptionalResult = { tenantId: 'test-tenant-id' };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/settings/contact', () => {
    it('returns 401 without a session', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const res = await GET(new Request('http://localhost/api/settings/contact') as any);

      expect(res.status).toBe(401);
    });

    it('returns empty object when no tenant context', async () => {
      mocks.tenantOptionalResult = { tenantId: null };

      const res = await GET(new Request('http://localhost/api/settings/contact') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({});
    });

    it('returns contact settings as a key-value map', async () => {
      const rows = [
        { id: 's1', key: 'contact_email', value: 'admin@soralia.com', tenantId: 'test-tenant-id' },
        { id: 's2', key: 'contact_phone', value: '+1-555-0123', tenantId: 'test-tenant-id' },
        { id: 's3', key: 'contact_address', value: '123 Village Way', tenantId: 'test-tenant-id' },
      ];
      mocks.dbMock.select.mockReturnValue(makeSelectChain(rows));

      const res = await GET(new Request('http://localhost/api/settings/contact') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({
        contact_email: 'admin@soralia.com',
        contact_phone: '+1-555-0123',
        contact_address: '123 Village Way',
      });
    });

    it('returns empty object when no contact settings exist', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const res = await GET(new Request('http://localhost/api/settings/contact') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({});
    });
  });

  describe('POST /api/settings/contact', () => {
    function postRequest(body: unknown): Request {
      return new Request('http://localhost/api/settings/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    it('returns 401 without a session', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const res = await POST(postRequest({ contact_email: 'admin@soralia.com' }));

      expect(res.status).toBe(401);
    });

    it('inserts contact settings and returns success', async () => {
      const onConflictDoUpdate = vi.fn(() => Promise.resolve());
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn(() => ({ onConflictDoUpdate })),
      });

      const res = await POST(
        postRequest({
          contact_email: 'admin@soralia.com',
          contact_phone: '+1-555-0123',
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({ success: true });
      expect(mocks.dbMock.insert).toHaveBeenCalledTimes(1);
      expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    });

    it('sanitizes keys to lowercase underscore IDs', async () => {
      const onConflictDoUpdate = vi.fn(() => Promise.resolve());
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn((entries: unknown[]) => {
          expect(entries).toHaveLength(1);
          expect((entries[0] as any).id).toBe('contact_email');
          expect((entries[0] as any).key).toBe('Contact-Email');
          expect((entries[0] as any).value).toBe('admin@soralia.com');
          return { onConflictDoUpdate };
        }),
      });

      const res = await POST(postRequest({ 'Contact-Email': 'admin@soralia.com' }));

      expect(res.status).toBe(200);
      expect(onConflictDoUpdate).toHaveBeenCalledWith({
        target: expect.any(Array),
        set: { value: expect.any(Object) },
      });
    });

    it('handles empty body without calling insert', async () => {
      const res = await POST(postRequest({}));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({ success: true });
      expect(mocks.dbMock.insert).not.toHaveBeenCalled();
    });

    it('converts all values to strings', async () => {
      const onConflictDoUpdate = vi.fn(() => Promise.resolve());
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn((entries: unknown[]) => {
          expect(entries).toHaveLength(2);
          expect((entries[0] as any).value).toBe('true');
          expect((entries[1] as any).value).toBe('42');
          return { onConflictDoUpdate };
        }),
      });

      const res = await POST(postRequest({ enabled: true, max_count: 42 }));

      expect(res.status).toBe(200);
    });

    it('uses onConflictDoUpdate for upsert behavior', async () => {
      const onConflictDoUpdate = vi.fn(() => Promise.resolve());
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn(() => ({ onConflictDoUpdate })),
      });

      await POST(postRequest({ contact_email: 'admin@soralia.com' }));

      expect(onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.any(Array),
          set: expect.objectContaining({ value: expect.any(Object) }),
        })
      );
    });
  });
});
