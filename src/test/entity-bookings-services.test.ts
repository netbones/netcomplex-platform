import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { selectMock, permMocks } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  permMocks: {
    hasPermission: vi.fn(),
    apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  },
}));

vi.mock('@shared/lib', () => ({
  hasPermission: permMocks.hasPermission,
  apiLogger: permMocks.apiLogger,
}));

vi.mock('@api/server', () => ({
  db: { select: selectMock },
  bookings: {
    tenantId: { name: 'tenantId' },
    userId: { name: 'userId' },
    facility: { name: 'facility' },
    date: { name: 'date' },
  },
  settings: {
    tenantId: { name: 'tenantId' },
    key: { name: 'key' },
  },
  users: {},
}));

import { buildBookingConditions, getTenantFacilities } from '../entities/booking/services';
import { canViewAllBookings } from '../entities/booking/permissions';
import { DEFAULT_FACILITIES } from '../entities/booking/model';
import { makeSelectChain } from './api/helpers';

describe('buildBookingConditions', () => {
  const tenantId = 'tenant-1';
  const userId = 'user-1';

  function colName(cond: unknown): string {
    return (cond as { queryChunks: Record<string, unknown>[] }).queryChunks[1].name as string;
  }

  function condValue(cond: unknown): unknown {
    return (cond as { queryChunks: unknown[] }).queryChunks[3];
  }

  it('returns only tenant condition when canViewAll is true (admin view, no filters)', () => {
    const conditions = buildBookingConditions({
      tenantId,
      userId,
      canViewAll: true,
    });

    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toBeDefined();
    expect(colName(conditions[0])).toBe('tenantId');
    expect(condValue(conditions[0])).toBe(tenantId);
  });

  it('returns tenant + userId conditions when canViewAll is false (user-scoped view)', () => {
    const conditions = buildBookingConditions({
      tenantId,
      userId,
      canViewAll: false,
    });

    expect(conditions).toHaveLength(2);
    expect(colName(conditions[0])).toBe('tenantId');
    expect(condValue(conditions[0])).toBe(tenantId);
    expect(colName(conditions[1])).toBe('userId');
    expect(condValue(conditions[1])).toBe(userId);
  });

  it('adds facility filter when facility is provided', () => {
    const conditions = buildBookingConditions({
      tenantId,
      userId,
      canViewAll: true,
      facility: 'POOL',
    });

    expect(conditions).toHaveLength(2);
    expect(colName(conditions[0])).toBe('tenantId');
    expect(colName(conditions[1])).toBe('facility');
    expect(condValue(conditions[1])).toBe('POOL');
  });

  it('adds date filter when date is provided (gte query)', () => {
    const dateStr = '2026-06-15';
    const conditions = buildBookingConditions({
      tenantId,
      userId,
      canViewAll: true,
      date: dateStr,
    });

    expect(conditions).toHaveLength(2);
    expect(colName(conditions[0])).toBe('tenantId');
    expect(colName(conditions[1])).toBe('date');
    expect(condValue(conditions[1])).toEqual(new Date(dateStr));
  });

  it('combines all filters (tenant + userId + facility + date)', () => {
    const dateStr = '2026-06-15';
    const conditions = buildBookingConditions({
      tenantId,
      userId,
      canViewAll: false,
      facility: 'POOL',
      date: dateStr,
    });

    expect(conditions).toHaveLength(4);
    expect(colName(conditions[0])).toBe('tenantId');
    expect(condValue(conditions[0])).toBe(tenantId);
    expect(colName(conditions[1])).toBe('userId');
    expect(colName(conditions[2])).toBe('facility');
    expect(colName(conditions[3])).toBe('date');
  });

  it('returns minimal result when only tenant isolation applies', () => {
    const conditions = buildBookingConditions({
      tenantId,
      userId,
      canViewAll: true,
    });

    expect(conditions).toHaveLength(1);
  });
});

describe('canViewAllBookings', () => {
  beforeEach(() => {
    permMocks.hasPermission.mockReset();
  });

  it('delegates to hasPermission with the role and "bookings" permission', () => {
    permMocks.hasPermission.mockReturnValue(true);

    const result = canViewAllBookings('ADMIN');

    expect(result).toBe(true);
    expect(permMocks.hasPermission).toHaveBeenCalledWith('ADMIN', 'bookings');
  });

  it('returns true for ADMIN role', () => {
    permMocks.hasPermission.mockReturnValue(true);
    expect(canViewAllBookings('ADMIN')).toBe(true);
  });

  it('returns true for RESIDENT role (booking permission granted)', () => {
    permMocks.hasPermission.mockReturnValue(true);
    expect(canViewAllBookings('RESIDENT')).toBe(true);
  });

  it('returns true for BOARD role (booking permission granted)', () => {
    permMocks.hasPermission.mockReturnValue(true);
    expect(canViewAllBookings('BOARD')).toBe(true);
  });

  it('returns false when hasPermission returns false', () => {
    permMocks.hasPermission.mockReturnValue(false);
    expect(canViewAllBookings('RESIDENT')).toBe(false);
  });

  it('passes null/undefined through to hasPermission', () => {
    permMocks.hasPermission.mockReturnValue(false);
    expect(canViewAllBookings(undefined as unknown as string)).toBe(false);
    expect(permMocks.hasPermission).toHaveBeenCalledWith(undefined, 'bookings');
  });
});

describe('getTenantFacilities', () => {
  const tenantId = 'tenant-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to DEFAULT_FACILITIES when no settings rows returned', async () => {
    selectMock.mockReturnValue(makeSelectChain([]));

    const result = await getTenantFacilities(tenantId);

    expect(result).toEqual(DEFAULT_FACILITIES);
  });

  it('falls back to DEFAULT_FACILITIES when settings value is empty', async () => {
    selectMock.mockReturnValue(
      makeSelectChain([{ id: 's1', tenantId, key: 'booking_facilities', value: '' }])
    );

    const result = await getTenantFacilities(tenantId);

    expect(result).toEqual(DEFAULT_FACILITIES);
  });

  it('falls back to DEFAULT_FACILITIES when JSON parse fails', async () => {
    selectMock.mockReturnValue(
      makeSelectChain([{ id: 's1', tenantId, key: 'booking_facilities', value: 'not-json' }])
    );

    const result = await getTenantFacilities(tenantId);

    expect(result).toEqual(DEFAULT_FACILITIES);
    expect(permMocks.apiLogger.error).toHaveBeenCalled();
  });

  it('falls back to DEFAULT_FACILITIES when parsed value is not an array', async () => {
    selectMock.mockReturnValue(
      makeSelectChain([
        { id: 's1', tenantId, key: 'booking_facilities', value: '{"some":"object"}' },
      ])
    );

    const result = await getTenantFacilities(tenantId);

    expect(result).toEqual(DEFAULT_FACILITIES);
  });

  it('falls back to DEFAULT_FACILITIES when parsed array is empty', async () => {
    selectMock.mockReturnValue(
      makeSelectChain([{ id: 's1', tenantId, key: 'booking_facilities', value: '[]' }])
    );

    const result = await getTenantFacilities(tenantId);

    expect(result).toEqual(DEFAULT_FACILITIES);
  });

  it('returns configured facilities from settings', async () => {
    const customFacilities = [
      { value: 'POOL', label: 'Swimming Pool' },
      { value: 'SAUNA', label: 'Sauna' },
    ];

    selectMock.mockReturnValue(
      makeSelectChain([
        {
          id: 's1',
          tenantId,
          key: 'booking_facilities',
          value: JSON.stringify(customFacilities),
        },
      ])
    );

    const result = await getTenantFacilities(tenantId);

    expect(result).toEqual(customFacilities);
  });

  it('handles db query errors gracefully by falling back to defaults', async () => {
    selectMock.mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    const result = await getTenantFacilities(tenantId);

    expect(result).toEqual(DEFAULT_FACILITIES);
    expect(permMocks.apiLogger.error).toHaveBeenCalled();
  });
});
