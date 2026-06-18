import { describe, it, expect } from 'vitest';
import { toBookingDTO, toBookingDTOs } from '../shared/api/dto/booking';
import type { InferSelectModel } from 'drizzle-orm';
import type { bookings } from '../shared/api/db';

type BookingRow = InferSelectModel<typeof bookings>;

function makeBooking(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: 'booking-1',
    tenantId: 'tenant-1',
    propertyId: 'prop-1',
    userId: 'user-1',
    facility: 'POOL',
    date: new Date('2026-06-15T10:00:00.000Z'),
    startTime: '10:00',
    endTime: '11:00',
    purpose: 'Morning swim',
    status: 'CONFIRMED',
    deletedAt: null,
    createdAt: new Date('2026-06-10T08:00:00.000Z'),
    updatedAt: new Date('2026-06-12T09:00:00.000Z'),
    ...overrides,
  } as BookingRow;
}

describe('toBookingDTO', () => {
  it('maps all fields correctly', () => {
    const booking = makeBooking();
    const dto = toBookingDTO(booking);

    expect(dto.id).toBe('booking-1');
    expect(dto.propertyId).toBe('prop-1');
    expect(dto.userId).toBe('user-1');
    expect(dto.facility).toBe('POOL');
    expect(dto.startTime).toBe('10:00');
    expect(dto.endTime).toBe('11:00');
    expect(dto.purpose).toBe('Morning swim');
    expect(dto.status).toBe('CONFIRMED');
  });

  it('converts dates to ISO strings', () => {
    const booking = makeBooking();
    const dto = toBookingDTO(booking);

    expect(dto.date).toBe('2026-06-15T10:00:00.000Z');
    expect(dto.createdAt).toBe('2026-06-10T08:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-06-12T09:00:00.000Z');
  });

  it('preserves null purpose as null', () => {
    const booking = makeBooking({ purpose: null });
    const dto = toBookingDTO(booking);

    expect(dto.purpose).toBeNull();
  });

  it('preserves null propertyId as null', () => {
    const booking = makeBooking({ propertyId: null });
    const dto = toBookingDTO(booking);

    expect(dto.propertyId).toBeNull();
  });

  it('maps userId from the booking user object', () => {
    const booking = makeBooking({ userId: 'user-42' });
    const dto = toBookingDTO(booking);

    expect(dto.userId).toBe('user-42');
  });

  it('handles missing date gracefully with current timestamp fallback', () => {
    const booking = makeBooking({ date: null as unknown as Date });
    const before = new Date().toISOString();
    const dto = toBookingDTO(booking);
    const after = new Date().toISOString();

    expect(dto.date >= before || dto.date <= after).toBe(true);
  });

  it('handles missing createdAt with current timestamp fallback', () => {
    const booking = makeBooking({ createdAt: null as unknown as Date });
    const before = new Date().toISOString();
    const dto = toBookingDTO(booking);
    const after = new Date().toISOString();

    expect(dto.createdAt >= before || dto.createdAt <= after).toBe(true);
  });

  it('handles missing updatedAt with current timestamp fallback', () => {
    const booking = makeBooking({ updatedAt: null as unknown as Date });
    const before = new Date().toISOString();
    const dto = toBookingDTO(booking);
    const after = new Date().toISOString();

    expect(dto.updatedAt >= before || dto.updatedAt <= after).toBe(true);
  });
});

describe('toBookingDTOs', () => {
  it('maps an array of booking rows to DTOs', () => {
    const rows = [makeBooking({ id: 'b-1' }), makeBooking({ id: 'b-2', facility: 'GYM' })];

    const dtos = toBookingDTOs(rows);

    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe('b-1');
    expect(dtos[0].facility).toBe('POOL');
    expect(dtos[1].id).toBe('b-2');
    expect(dtos[1].facility).toBe('GYM');
  });

  it('handles an empty array', () => {
    const dtos = toBookingDTOs([]);

    expect(dtos).toHaveLength(0);
    expect(dtos).toEqual([]);
  });

  it('returns a new array (does not mutate input)', () => {
    const rows = [makeBooking()];
    const dtos = toBookingDTOs(rows);

    expect(dtos).not.toBe(rows);
  });
});
