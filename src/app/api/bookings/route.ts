import { requireAuth } from '@/shared/api/auth-utils';

import {
  revalidateDashboard,
  apiCreated,
  apiError,
  apiInternalError,
  apiSuccess,
  emitEvent,
  now,
  rateLimitByUser,
} from '@api/server';

import { bookingSchema } from '@entities/booking';
import { toBookingDTO } from '@api/server';

import { apiLogger } from '@shared/lib';

import { withTenant } from '@entities/tenant/server';
import {
  listBookings,
  validateFacility,
  createBooking,
  checkBookingConflict,
} from '@entities/booking/server';

// Limit execution time to 8 seconds for booking operations
export const maxDuration = 8;

/**
 * Retrieves session and role from the request for API routes.
 * @param request - Incoming HTTP request
 * @returns Session data with user ID and role, or null if not authenticated
 */
/** getTenantFacilities moved to @entities/booking */

/**
 * GET /api/bookings - List facility bookings
 * Residents see only their own, admins see all
 * @query facility - Filter by facility name (tenant-configurable)
 * @query date - Filter bookings from this date onwards
 * @deprecated Use `trpc.bookings.listBookings` instead
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, { permission: 'bookings', module: 'bookings' });
  if (!auth.success) return auth.response;
  const canViewAll = true;

  const { searchParams } = new URL(request.url);
  const facility = searchParams.get('facility');
  let date = searchParams.get('date');

  // Normalize "today" to today's ISO date string to avoid Invalid Date
  if (date === 'today') {
    date = now().toISOString().split('T')[0];
  }

  const { tenantId } = await withTenant();

  // Delegate to entity service for query building and execution
  const bookingResults = await listBookings({
    tenantId,
    userId: auth.data.userId,
    canViewAll,
    facility,
    date,
  });

  // Transform results using DTO
  const transformed = bookingResults.map(row => {
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

  return apiSuccess(transformed);
}

/**
 * POST /api/bookings - Create a new facility booking
 * @body userId - User ID (defaults to authenticated user)
 * @body facility - Facility to book
 * @body date - Booking date
 * @body startTime - Start time
 * @body endTime - End time
 * @body purpose - Purpose of booking
 * @deprecated Use `trpc.bookings.createBooking` instead
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request, { module: 'bookings' });
  if (!auth.success) return auth.response;

  const rateLimit = await rateLimitByUser(auth.data.userId, {
    windowMs: 60_000,
    maxRequests: 10,
  });
  if (rateLimit) return rateLimit;

  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = bookingSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('VALIDATION_ERROR', 'Invalid input', 400, validationResult.error.issues);
    }

    const { facility, date, startTime, endTime, purpose } = validationResult.data;
    const userId = body.userId || auth.data.userId;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Validate facility against tenant's configured facilities using service
    const validation = await validateFacility(facility, tenantId);
    if (!validation.valid) {
      return apiError(
        'INVALID_FACILITY',
        `Invalid facility. Valid options: ${validation.validOptions.join(', ')}`,
        400
      );
    }

    // Check for conflicting bookings (same facility, date, overlapping time)
    const conflictId = await checkBookingConflict({
      tenantId,
      facility,
      date: new Date(date),
      startTime,
      endTime,
    });

    if (conflictId) {
      return apiError(
        'CONFLICT',
        'This time slot is no longer available. Please choose another time.',
        409
      );
    }

    // Delegate to service for booking creation
    const [booking] = await createBooking({
      tenantId,
      userId,
      facility,
      date: new Date(date),
      startTime,
      endTime,
      purpose,
    });

    // Revalidate dashboard caches immediately when new booking is created
    revalidateDashboard();

    emitEvent('booking.created', {
      tenantId,
      userId,
      bookingId: booking.id,
      facility,
    });

    return apiCreated(booking);
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/bookings' }, 'Booking creation error');
    return apiInternalError();
  }
}
