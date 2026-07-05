import * as bookingService from '../services';
import { toBookingDTO } from '@api/server';

/**
 * Lists bookings for a tenant with optional filtering.
 */
export async function listBookings(params: {
  tenantId: string;
  userId: string;
  canViewAll: boolean;
  facility?: string | null;
  date?: string | null;
}) {
  const bookingResults = await bookingService.listBookings(params);

  return bookingResults.map(row => {
    const b = row.Booking;
    const u = row.user;
    return {
      ...toBookingDTO(b),
      user: u
        ? {
            id: u.id,
            name: u.name,
          }
        : null,
    };
  });
}

/**
 * Validates a facility and creates a booking.
 */
export async function createBooking(data: {
  tenantId: string;
  userId: string;
  facility: string;
  date: Date;
  startTime: string;
  endTime: string;
  purpose: string;
}) {
  // Validate facility against tenant's configured facilities
  const validation = await bookingService.validateFacility(data.facility, data.tenantId);
  if (!validation.valid) {
    return {
      ok: false as const,
      error: `Invalid facility. Valid options: ${validation.validOptions.join(', ')}`,
    };
  }

  const [booking] = await bookingService.createBooking(data);

  return { ok: true as const, booking };
}
