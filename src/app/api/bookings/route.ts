import {
  auth,
  revalidateDashboard,
  db,
  bookings,
  users,
  apiCreated,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  assertModuleEnabled,
} from '@api/server';

import { hasPermission } from '@shared/lib';
import { bookingSchema } from '@entities/booking';
import { toBookingDTO } from '@api/shared';

import { apiLogger } from '@shared/lib';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@/entities/tenant/api/with-tenant';
import { listBookings, validateFacility, createBooking } from '../../../entities/booking/services';

// Limit execution time to 8 seconds for booking operations
export const maxDuration = 8;

/**
 * Retrieves session and role from the request for API routes.
 * @param request - Incoming HTTP request
 * @returns Session data with user ID and role, or null if not authenticated
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  // Use Drizzle instead of Prisma
  const userResult = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult[0]?.role || 'RESIDENT',
  };
}

/** getTenantFacilities moved to @entities/booking */

/**
 * GET /api/bookings - List facility bookings
 * Residents see only their own, admins see all
 * @query facility - Filter by facility name (tenant-configurable)
 * @query date - Filter bookings from this date onwards
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  // Feature gate: check bookings module is enabled for tenant
  const featureCheck = await assertModuleEnabled('bookings');
  if (featureCheck) return featureCheck;

  const canViewAll = hasPermission(authData.role, 'bookings');

  const { searchParams } = new URL(request.url);
  const facility = searchParams.get('facility');
  let date = searchParams.get('date');

  // Normalize "today" to today's ISO date string to avoid Invalid Date
  if (date === 'today') {
    date = new Date().toISOString().split('T')[0];
  }

  const { tenantId } = await withTenant();

  // Delegate to entity service for query building and execution
  const bookingResults = await listBookings({
    tenantId,
    userId: authData.userId,
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
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  // Feature gate: check bookings module is enabled for tenant
  const featureCheck = await assertModuleEnabled('bookings');
  if (featureCheck) return featureCheck;

  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = bookingSchema.safeParse(body);
    if (!validationResult.success) {
      return apiSuccess(
        { error: 'Invalid input', details: validationResult.error.issues },
        undefined,
        400
      );
    }

    const { facility, date, startTime, endTime, purpose } = validationResult.data;
    const userId = body.userId || authData.userId;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Validate facility against tenant's configured facilities using service
    const validation = await validateFacility(facility, tenantId);
    if (!validation.valid) {
      return apiSuccess(
        { error: `Invalid facility. Valid options: ${validation.validOptions.join(', ')}` },
        undefined,
        400
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

    return apiCreated(booking);
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/bookings' }, 'Booking creation error');
    return apiInternalError();
  }
}
