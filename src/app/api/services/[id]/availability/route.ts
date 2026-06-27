import { NextRequest } from 'next/server';
import {
  auth,
  db,
  communityServiceListings,
  serviceBookings,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
} from '@api/server';

import { eq, and, ne, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

// D-09: Weekly availability contract
interface TimeRange {
  start: string;
  end: string;
}

type WeeklySchedule = Record<string, TimeRange[]>;

interface BookedSlot {
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * GET /api/services/[id]/availability — Get provider availability for a listing
 *
 * Per D-09:
 * - Reads CommunityServiceListing.availability jsonb field
 * - Parses into weekly schedule
 * - Queries existing non-cancelled bookings for next 30 days
 * - Returns { availability, bookedSlots }
 *
 * Per T-50-16: No provider PII, no resident names on booked slots
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { tenantId } = await withTenant();
    const { id: listingId } = await params;

    if (!listingId) {
      return apiError('VALIDATION_ERROR', 'Listing ID is required', 400);
    }

    // Fetch listing with availability field
    const [listing] = await db
      .select({
        id: communityServiceListings.id,
        availability: communityServiceListings.availability,
        tenantId: communityServiceListings.tenantId,
      })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.id, listingId),
          eq(communityServiceListings.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!listing) {
      return apiNotFound('Service listing not found');
    }

    // Parse availability JSONB into WeeklySchedule
    const rawAvailability = listing.availability as Record<string, unknown> | null;
    const availability: WeeklySchedule = {};

    if (rawAvailability && typeof rawAvailability === 'object') {
      for (const [day, ranges] of Object.entries(rawAvailability)) {
        if (Array.isArray(ranges)) {
          availability[day.toLowerCase()] = ranges as TimeRange[];
        }
      }
    }

    // Ensure all 7 days exist (default empty for missing days)
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of DAYS) {
      if (!availability[day]) {
        availability[day] = [];
      }
    }

    // Query existing bookings for next 30 days (status != CANCELLED)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const existingBookings = await db
      .select({
        date: serviceBookings.date,
        startTime: serviceBookings.startTime,
        endTime: serviceBookings.endTime,
      })
      .from(serviceBookings)
      .where(
        and(
          eq(serviceBookings.listingId, listingId),
          eq(serviceBookings.tenantId, tenantId),
          ne(serviceBookings.status, 'CANCELLED'),
          sql`${serviceBookings.date} >= ${today.toISOString().split('T')[0]}`,
          sql`${serviceBookings.date} <= ${thirtyDaysFromNow.toISOString().split('T')[0]}`
        )
      );

    // Map to BookedSlot array (T-50-16: no PII)
    const bookedSlots: BookedSlot[] = existingBookings.map(b => ({
      date: b.date instanceof Date ? b.date.toISOString().split('T')[0] : String(b.date),
      startTime: b.startTime,
      endTime: b.endTime,
    }));

    return apiSuccess({ availability, bookedSlots });
  } catch (error) {
    logError(
      { component: 'availability-api', operation: 'GET' },
      'Availability fetch error',
      error
    );
    return apiInternalError();
  }
}
