/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeUpdateChain, makeInsertChain } from './helpers';

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
  getTenantFacilities: vi.fn(),
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    users: { id: 'id', tenantId: 'tenantId', name: 'name', email: 'email', role: 'role', createdAt: 'createdAt' },
    settings: { id: 'id', tenantId: 'tenantId', key: 'key', value: 'value' },
    sessions: { id: 'id', userId: 'userId', expiresAt: 'expiresAt' },
    db: mocks.dbMock,
    getSessionAndRole: () => mocks.getSessionAndRole(),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message } }, { status: 401 }) as any,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message } }, { status: 403 }) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 }) as any,
    withErrorHandler: (handler: any) => handler,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@entities/booking/server', () => ({
  getTenantFacilities: () => mocks.getTenantFacilities(),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  isAdmin: (role: string | null | undefined) => {
    if (!role) return false;
    return ['ADMIN', 'BOARD'].includes(role);
  },
}));

vi.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
}));

import { GET as BOOKINGS_GET, PUT as BOOKINGS_PUT } from '@/app/api/admin/bookings/route';

describe('Admin Bookings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' });
    mocks.getTenantFacilities.mockResolvedValue([]);
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.transaction.mockImplementation(async (fn: any) => fn(mocks.dbMock));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/bookings', () => {
    it('returns 403 when no session', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const res = await BOOKINGS_GET();

      expect(res.status).toBe(403);
    });

    it('returns 403 for non-admin role', async () => {
      mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-2', role: 'RESIDENT' });

      const res = await BOOKINGS_GET();

      expect(res.status).toBe(403);
    });

    it('returns facilities for admin', async () => {
      const facilities = [
        { value: 'clubhouse', label: 'Clubhouse' },
        { value: 'pool', label: 'Pool' },
      ];
      mocks.getTenantFacilities.mockResolvedValue(facilities);

      const res = await BOOKINGS_GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual(facilities);
    });

    it('returns 500 on internal error', async () => {
      mocks.getTenantFacilities.mockRejectedValue(new Error('DB error'));

      const res = await BOOKINGS_GET();

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/admin/bookings', () => {
    const facilityBody = [{ value: 'clubhouse', label: 'Clubhouse' }];

    function putRequest(body: unknown) {
      return new Request('http://localhost/api/admin/bookings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }) as any;
    }

    it('returns 403 when no session', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const res = await BOOKINGS_PUT(putRequest(facilityBody));

      expect(res.status).toBe(403);
    });

    it('returns 403 for non-admin role', async () => {
      mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-2', role: 'RESIDENT' });

      const res = await BOOKINGS_PUT(putRequest(facilityBody));

      expect(res.status).toBe(403);
    });

    it('returns 400 when body is not an array', async () => {
      const res = await BOOKINGS_PUT(putRequest({ not: 'an array' }));

      expect(res.status).toBe(400);
    });

    it('returns 400 when facility has missing label', async () => {
      const res = await BOOKINGS_PUT(putRequest([{ value: 'clubhouse' }]));

      expect(res.status).toBe(400);
    });

    it('returns 400 when facility has missing value', async () => {
      const res = await BOOKINGS_PUT(putRequest([{ label: 'Clubhouse' }]));

      expect(res.status).toBe(400);
    });

    it('inserts new facilities when no existing record', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([])); // no existing row
      mocks.dbMock.insert.mockReturnValue(makeInsertChain([{ id: 'new-id' }]));

      const res = await BOOKINGS_PUT(putRequest(facilityBody));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({ success: true });
      expect(mocks.dbMock.insert).toHaveBeenCalledOnce();
      expect(mocks.dbMock.update).not.toHaveBeenCalled();
    });

    it('updates existing facilities when record found', async () => {
      const existing = [{ id: 'existing-id', tenantId: 'test-tenant-id', key: 'booking_facilities', value: '[]' }];
      mocks.dbMock.select.mockReturnValue(makeSelectChain(existing));
      mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'existing-id' }]));

      const res = await BOOKINGS_PUT(putRequest(facilityBody));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({ success: true });
      expect(mocks.dbMock.update).toHaveBeenCalledOnce();
      expect(mocks.dbMock.insert).not.toHaveBeenCalled();
    });

    it('returns 500 on internal error', async () => {
      mocks.getSessionAndRole.mockRejectedValue(new Error('Auth broke'));

      const res = await BOOKINGS_PUT(putRequest(facilityBody));

      expect(res.status).toBe(500);
    });
  });
});
