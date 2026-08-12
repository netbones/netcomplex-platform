import { requireAuth } from '@/shared/api/auth-utils';
import { db, bookings, apiSuccess } from '@api/server';
import { amenities } from '@/db/schema/amenities';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { eq, and, isNotNull, desc } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * GET /api/amenities/bookings
 * Lists the authenticated resident's bookings, joined with amenity details.
 * Only returns rows that reference an amenity (amenityId is set).
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;
  const featureCheck = await assertModuleEnabled('bookings');
  if (featureCheck) return featureCheck;

  const { tenantId } = await withTenant();

  const rows = await db
    .select({
      id: bookings.id,
      amenityId: bookings.amenityId,
      status: bookings.status,
      date: bookings.date,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      cancelledAt: bookings.cancelledAt,
      purpose: bookings.purpose,
      amenityName: amenities.name,
      amenityIcon: amenities.icon,
    })
    .from(bookings)
    .leftJoin(amenities, eq(bookings.amenityId, amenities.id))
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.userId, auth.data.userId),
        isNotNull(bookings.amenityId)
      )
    )
    .orderBy(desc(bookings.date), desc(bookings.startTime));

  return apiSuccess(rows);
}
