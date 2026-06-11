import {
  db,
  bookings,
  settings,
  users,
} from '@api/server';

import { eq, asc, gte, and, sql } from 'drizzle-orm';
import { DEFAULT_FACILITIES } from '@entities/booking';
import type { TenantFacility } from '@entities/booking';
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
