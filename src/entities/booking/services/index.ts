import { db, bookings, settings, users } from '@api/server';

import { eq, asc, gte, and, sql, ne } from 'drizzle-orm';
import { DEFAULT_FACILITIES } from '../model';
import type { TenantFacility } from '../model';
import { apiLogger } from '@shared/lib';

/**
 * Fetches tenant-configured facilities from the settings table.
 * Falls back to DEFAULT_FACILITIES if no tenant config found.
 */
export async function getTenantFacilities(tenantId: string): Promise<TenantFacility[]> {
  try {
    const result = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, 'booking_facilities')))
      .limit(1);

    if (result.length > 0 && result[0].value) {
      const parsed = JSON.parse(result[0].value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as TenantFacility[];
      }
    }
  } catch (error) {
    apiLogger.error({ err: error, tenantId }, 'Failed to fetch tenant facilities, using defaults');
  }

  return DEFAULT_FACILITIES;
}

/**
 * Validates that a facility exists in the tenant's configured facilities list.
 * Returns the valid options in the error message if validation fails.
 */
export async function validateFacility(
  facility: string,
  tenantId: string
): Promise<{ valid: boolean; validOptions: string[] }> {
  const tenantFacilities = await getTenantFacilities(tenantId);
  const validFacilityValues = tenantFacilities.map(f => f.value);

  if (!validFacilityValues.includes(facility)) {
    return { valid: false, validOptions: validFacilityValues };
  }

  return { valid: true, validOptions: validFacilityValues };
}

/**
 * Builds the query conditions for listing bookings.
 * Admins see all, residents see only their own.
 */
export function buildBookingConditions(params: {
  tenantId: string;
  userId: string;
  canViewAll: boolean;
  facility?: string | null;
  date?: string | null;
}) {
  const queryConditions = [eq(bookings.tenantId, params.tenantId)];

  if (!params.canViewAll) {
    queryConditions.push(eq(bookings.userId, params.userId));
  }

  if (params.facility) {
    queryConditions.push(eq(bookings.facility, params.facility));
  }

  if (params.date) {
    queryConditions.push(gte(bookings.date, new Date(params.date)));
  }

  return queryConditions;
}

/**
 * Lists bookings with optional filtering by facility and date.
 */
export async function listBookings(params: {
  tenantId: string;
  userId: string;
  canViewAll: boolean;
  facility?: string | null;
  date?: string | null;
}) {
  const queryConditions = buildBookingConditions(params);
  const whereClause = queryConditions.length > 0 ? and(...queryConditions) : undefined;

  return db
    .select()
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(whereClause)
    .orderBy(asc(bookings.date));
}

/**
 * Checks for conflicting bookings — same facility, same date, overlapping time.
 * Returns the conflicting booking ID if found, null otherwise.
 */
export async function checkBookingConflict(params: {
  tenantId: string;
  facility: string;
  date: Date;
  startTime: string;
  endTime: string;
  excludeBookingId?: string;
}): Promise<string | null> {
  const [conflicting] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, params.tenantId),
        eq(bookings.facility, params.facility),
        eq(bookings.date, params.date),
        ne(bookings.status, 'CANCELLED'),
        sql`(
          (${bookings.startTime} < ${params.endTime} AND ${bookings.endTime} > ${params.startTime})
        )`,
        params.excludeBookingId ? ne(bookings.id, params.excludeBookingId) : undefined
      )
    )
    .limit(1);

  return conflicting?.id ?? null;
}

/**
 * Gets booked time slots for a facility on a given date.
 * Only returns non-cancelled bookings.
 */
export async function getBookedSlots(params: {
  tenantId: string;
  facility: string;
  date: Date;
}): Promise<{ startTime: string; endTime: string }[]> {
  const result = await db
    .select({
      startTime: bookings.startTime,
      endTime: bookings.endTime,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, params.tenantId),
        eq(bookings.facility, params.facility),
        eq(bookings.date, params.date),
        ne(bookings.status, 'CANCELLED')
      )
    );

  return result;
}

/**
 * Creates a new booking record in the database.
 */
export async function createBooking(data: {
  tenantId: string;
  userId: string;
  facility: string;
  date: Date;
  startTime: string;
  endTime: string;
  purpose: string;
  amenityId?: string | null;
}) {
  const now = new Date();
  type BookingStatus = (typeof bookings.status.enumValues)[number];

  return db
    .insert(bookings)
    .values({
      id: sql`gen_random_uuid()`,
      tenantId: data.tenantId,
      userId: data.userId,
      facility: data.facility,
      amenityId: data.amenityId ?? null,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      purpose: data.purpose,
      status: 'CONFIRMED' as BookingStatus,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
}
