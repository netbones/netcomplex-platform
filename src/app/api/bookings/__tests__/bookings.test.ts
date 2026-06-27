/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

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
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  assertModuleEnabled: vi.fn(),
  listBookings: vi.fn(),
  validateFacility: vi.fn(),
  createBooking: vi.fn(),
  revalidateDashboard: vi.fn(),
  bookingSafeParse: vi.fn(),
  toBookingDTO: vi.fn(),
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: {
      api: {
        getSession: () => Promise.resolve(mocks.sessionResult),
      },
    },
    db: mocks.dbMock,
    users: { id: 'id', role: 'role', name: 'name' },
    revalidateDashboard: mocks.revalidateDashboard,
    emitEvent: vi.fn(),
    now: () => new Date('2026-06-21T12:00:00Z'),
    CACHE_TAGS: { SETTINGS: 'settings' },
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiCreated: (data: unknown) =>
      NextResponse.json({ success: true, data }, { status: 201 }) as any,
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
    apiError: (code: string, message: string, status: number, details?: unknown) =>
      NextResponse.json({ success: false, error: { code, message, details } }, { status }) as any,
    withErrorHandler: (handler: any) => handler,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  assertModuleEnabled: (...args: unknown[]) => mocks.assertModuleEnabled(...args),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'bookings') return ['ADMIN', 'BOARD', 'MANAGER'].includes(role);
    return false;
  },
  apiLogger: mocks.apiLogger,
}));

vi.mock('@entities/booking', () => ({
  bookingSchema: {
    safeParse: (data: unknown) => mocks.bookingSafeParse(data),
  },
}));

vi.mock('@api/shared', () => ({
  toBookingDTO: (data: unknown) => mocks.toBookingDTO(data),
}));

vi.mock('@entities/booking/server', () => ({
  listBookings: (...args: unknown[]) => mocks.listBookings(...args),
  validateFacility: (...args: unknown[]) => mocks.validateFacility(...args),
  createBooking: (...args: unknown[]) => mocks.createBooking(...args),
}));

import { GET, POST } from '@/app/api/bookings/route';

describe('Bookings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.assertModuleEnabled.mockResolvedValue(null);
    mocks.bookingSafeParse.mockReturnValue({ success: true, data: {} });
    mocks.toBookingDTO.mockImplementation((b: any) => ({ ...b }));
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/bookings', () => {
    it('returns 401 without auth', async () => {
      const res = await GET(new Request('http://localhost/api/bookings') as any);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect((body as any).error?.code).toBe('AUTH_REQUIRED');
    });

    it('returns 403 when bookings module is disabled', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: { code: 'FEATURE_DISABLED' } }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));

      const res = await GET(new Request('http://localhost/api/bookings') as any);

      expect(res.status).toBe(403);
    });

    it('returns bookings list with valid auth', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.listBookings.mockResolvedValue([
        {
          Booking: { id: 'b1', facility: 'POOL', date: '2026-07-01' },
          user: { id: 'u1', name: 'Alice' },
        },
      ]);
      mocks.toBookingDTO.mockImplementation((b: any) => ({ ...b, facilityLabel: 'Swimming Pool' }));

      const res = await GET(new Request('http://localhost/api/bookings') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toHaveLength(1);
      expect((body as any).data[0].facilityLabel).toBe('Swimming Pool');
      expect((body as any).data[0].user.name).toBe('Alice');
      expect(mocks.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });

    it('returns empty list when no bookings exist', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.listBookings.mockResolvedValue([]);

      const res = await GET(new Request('http://localhost/api/bookings') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual([]);
    });

    it('filters by facility when query param provided', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.listBookings.mockResolvedValue([]);

      await GET(new Request('http://localhost/api/bookings?facility=GYM') as any);

      expect(mocks.listBookings).toHaveBeenCalledWith(expect.objectContaining({ facility: 'GYM' }));
    });

    it('normalizes date=today to ISO date string', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.listBookings.mockResolvedValue([]);

      await GET(new Request('http://localhost/api/bookings?date=today') as any);

      expect(mocks.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2026-06-21',
        })
      );
    });

    it('passes canViewAll=true for admin roles', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'BOARD' }]));
      mocks.listBookings.mockResolvedValue([]);

      await GET(new Request('http://localhost/api/bookings') as any);

      expect(mocks.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({ canViewAll: true })
      );
    });

    it('passes canViewAll=false for resident role', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));
      mocks.listBookings.mockResolvedValue([]);

      await GET(new Request('http://localhost/api/bookings') as any);

      expect(mocks.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({ canViewAll: false })
      );
    });

    it('enforces tenant isolation', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.listBookings.mockResolvedValue([]);

      await GET(new Request('http://localhost/api/bookings') as any);

      expect(mocks.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });

    it('defaults role to RESIDENT when user result is empty', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      // Empty user result triggers fallback to 'RESIDENT'
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
      mocks.listBookings.mockResolvedValue([]);

      await GET(new Request('http://localhost/api/bookings') as any);

      expect(mocks.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({ canViewAll: false })
      );
    });
  });

  describe('POST /api/bookings', () => {
    it('returns 401 without auth', async () => {
      const res = await POST(
        new Request('http://localhost/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facility: 'POOL',
            date: '2026-12-31',
            startTime: '09:00',
            endTime: '10:00',
          }),
        })
      );

      expect(res.status).toBe(401);
    });

    it('returns 403 when bookings module is disabled', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: { code: 'FEATURE_DISABLED' } }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

      const res = await POST(
        new Request('http://localhost/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facility: 'POOL',
            date: '2026-12-31',
            startTime: '09:00',
            endTime: '10:00',
          }),
        })
      );

      expect(res.status).toBe(403);
    });

    it('returns 400 when input validation fails', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(null);
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));
      mocks.bookingSafeParse.mockReturnValue({
        success: false,
        error: { issues: [{ path: ['facility'], message: 'Facility is required' }] },
      });

      const res = await POST(
        new Request('http://localhost/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalidField: 'test' }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect((body as any).error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when facility is invalid', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(null);
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));
      mocks.bookingSafeParse.mockReturnValue({
        success: true,
        data: {
          facility: 'INVALID',
          date: '2026-12-31',
          startTime: '09:00',
          endTime: '10:00',
          purpose: '',
        },
      });
      mocks.validateFacility.mockResolvedValue({ valid: false, validOptions: ['POOL', 'GYM'] });

      const res = await POST(
        new Request('http://localhost/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facility: 'INVALID',
            date: '2026-12-31',
            startTime: '09:00',
            endTime: '10:00',
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect((body as any).error?.code).toBe('INVALID_FACILITY');
    });

    it('creates a booking with valid data', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(null);
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));
      mocks.bookingSafeParse.mockReturnValue({
        success: true,
        data: {
          facility: 'POOL',
          date: '2026-12-31',
          startTime: '09:00',
          endTime: '10:00',
          purpose: 'Morning swim',
        },
      });
      mocks.validateFacility.mockResolvedValue({ valid: true });
      mocks.createBooking.mockResolvedValue([{ id: 'booking-1', facility: 'POOL' }]);

      const res = await POST(
        new Request('http://localhost/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facility: 'POOL',
            date: '2026-12-31',
            startTime: '09:00',
            endTime: '10:00',
            purpose: 'Morning swim',
          }),
        })
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect((body as any).data.id).toBe('booking-1');
      expect(mocks.revalidateDashboard).toHaveBeenCalledOnce();
    });

    it('enforces tenant isolation on create', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(null);
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));
      mocks.bookingSafeParse.mockReturnValue({
        success: true,
        data: {
          facility: 'GYM',
          date: '2026-12-31',
          startTime: '10:00',
          endTime: '11:00',
          purpose: '',
        },
      });
      mocks.validateFacility.mockResolvedValue({ valid: true });
      mocks.createBooking.mockResolvedValue([{ id: 'booking-1' }]);

      await POST(
        new Request('http://localhost/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facility: 'GYM',
            date: '2026-12-31',
            startTime: '10:00',
            endTime: '11:00',
          }),
        })
      );

      expect(mocks.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });

    it('uses body.userId when provided', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(null);
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.bookingSafeParse.mockReturnValue({
        success: true,
        data: {
          facility: 'POOL',
          date: '2026-12-31',
          startTime: '09:00',
          endTime: '10:00',
          purpose: '',
        },
      });
      mocks.validateFacility.mockResolvedValue({ valid: true });
      mocks.createBooking.mockResolvedValue([{ id: 'booking-1' }]);

      await POST(
        new Request('http://localhost/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'u2',
            facility: 'POOL',
            date: '2026-12-31',
            startTime: '09:00',
            endTime: '10:00',
          }),
        })
      );

      expect(mocks.createBooking).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u2' }));
    });

    it('returns 500 on booking creation error', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(null);
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));
      mocks.bookingSafeParse.mockReturnValue({
        success: true,
        data: {
          facility: 'POOL',
          date: '2026-12-31',
          startTime: '09:00',
          endTime: '10:00',
          purpose: '',
        },
      });
      mocks.validateFacility.mockResolvedValue({ valid: true });
      mocks.createBooking.mockRejectedValue(new Error('DB error'));

      const res = await POST(
        new Request('http://localhost/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facility: 'POOL',
            date: '2026-12-31',
            startTime: '09:00',
            endTime: '10:00',
          }),
        })
      );

      expect(res.status).toBe(500);
      expect(mocks.apiLogger.error).toHaveBeenCalled();
    });
  });
});
