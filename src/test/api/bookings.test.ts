import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock next/headers
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

// Hoisted mocks for shared mutable state
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  listBookings: vi.fn(),
  createBooking: vi.fn(),
  validateFacility: vi.fn(),
  assertModuleEnabled: vi.fn(),
}));

// Mock auth
vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
}));

// Mock db
vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  bookings: { id: 'id', tenantId: 'tenantId', facility: 'facility' },
  users: { id: 'id', role: 'role', name: 'name' },
}));

// Mock withTenant and feature gate
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'bookings') return role === 'ADMIN' || role === 'MANAGER';
    return false;
  }),
  assertModuleEnabled: (...args: unknown[]) => mocks.assertModuleEnabled(...args),
}));

// Mock booking services
vi.mock('@entities/booking', () => ({
  listBookings: (...args: unknown[]) => mocks.listBookings(...args),
  createBooking: (...args: unknown[]) => mocks.createBooking(...args),
  validateFacility: (...args: unknown[]) => mocks.validateFacility(...args),
}));

// Mock revalidation
vi.mock('@api/server', () => ({
  revalidateDashboard: vi.fn(),
}));

// Mock logger
vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET, POST } from '@/app/api/bookings/route';
import { makeSelectChain } from './helpers';

describe('Bookings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.assertModuleEnabled.mockResolvedValue(null); // Module enabled by default
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/bookings', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/bookings');
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 when bookings module is disabled for tenant', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: { code: 'FEATURE_DISABLED' } }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const request = new Request('http://localhost:3000/api/bookings');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('returns list with valid auth', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listBookings.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/bookings');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mocks.listBookings).toHaveBeenCalled();
    });

    it('filters by facility when query param provided', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listBookings.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/bookings?facility=POOL');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mocks.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({ facility: 'POOL' })
      );
    });

    it('normalizes today param to ISO date', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listBookings.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/bookings?date=today');
      await GET(request);

      expect(mocks.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        })
      );
    });

    it('enforces tenant isolation', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listBookings.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/bookings');
      await GET(request);

      expect(mocks.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });
  });

  describe('POST /api/bookings', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility: 'POOL',
          date: '2026-06-01',
          startTime: '09:00',
          endTime: '10:00',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 when bookings module is disabled', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: { code: 'FEATURE_DISABLED' } }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const request = new Request('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility: 'POOL',
          date: '2026-06-01',
          startTime: '09:00',
          endTime: '10:00',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('validates input with Zod schema', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(null);

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const request = new Request('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalidField: 'test' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('rejects invalid facility', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(null);
      mocks.validateFacility.mockResolvedValue({ valid: false, validOptions: ['POOL', 'GYM'] });

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const request = new Request('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility: 'INVALID',
          date: '2026-06-01',
          startTime: '09:00',
          endTime: '10:00',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('creates booking with valid data', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(null);

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.validateFacility.mockResolvedValue({ valid: true });
      mocks.createBooking.mockResolvedValue([{ id: 'booking-1', facility: 'POOL' }]);

      const request = new Request('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility: 'POOL',
          date: '2026-06-01',
          startTime: '09:00',
          endTime: '10:00',
          purpose: 'Morning swim',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      expect(mocks.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });

    it('enforces tenant isolation on create', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.assertModuleEnabled.mockResolvedValue(null);

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.validateFacility.mockResolvedValue({ valid: true });
      mocks.createBooking.mockResolvedValue([{ id: 'booking-1' }]);

      const request = new Request('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility: 'GYM',
          date: '2026-06-01',
          startTime: '10:00',
          endTime: '11:00',
        }),
      });

      await POST(request);

      expect(mocks.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });
  });
});
