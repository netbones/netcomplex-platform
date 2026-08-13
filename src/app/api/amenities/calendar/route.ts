import { NextRequest } from 'next/server';
import { db, apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { amenities } from '@/db/schema/amenities';
import { bookings } from '@/db/schema/bookings';
import { assignCalendarColors, CALENDAR_DOT_CAP, formatDateKey } from '@entities/amenity';
import { and, asc, eq, gte, inArray, isNull, lt } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * GET /api/amenities/calendar?year=2026&month=8&amenityId=optional
 * Month-grid density dots for bookable amenities (confirmed + waitlisted).
 * Privacy: never returns other residents' identities — only amenity ids per day.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('bookings');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month')); // 1–12
  const amenityFilter = searchParams.get('amenityId');

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return apiError('VALIDATION_ERROR', 'year and month (1–12) are required', 400);
  }

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const bookableRows = await db
    .select({
      id: amenities.id,
      name: amenities.name,
      icon: amenities.icon,
      sortOrder: amenities.sortOrder,
      hoursOpen: amenities.hoursOpen,
      hoursClose: amenities.hoursClose,
      slotDurationMins: amenities.slotDurationMins,
      maxOccupancy: amenities.maxOccupancy,
      waitlistEnabled: amenities.waitlistEnabled,
      photoUrl: amenities.photoUrl,
      rulesText: amenities.rulesText,
      bookable: amenities.bookable,
      contactEnabled: amenities.contactEnabled,
      contactPhone: amenities.contactPhone,
      description: amenities.description,
      active: amenities.active,
      tenantId: amenities.tenantId,
      createdAt: amenities.createdAt,
      updatedAt: amenities.updatedAt,
      deletedAt: amenities.deletedAt,
    })
    .from(amenities)
    .where(
      and(
        eq(amenities.tenantId, tenantId),
        eq(amenities.active, true),
        eq(amenities.bookable, true),
        isNull(amenities.deletedAt)
      )
    )
    .orderBy(asc(amenities.sortOrder), asc(amenities.name));

  const colored = assignCalendarColors(bookableRows);
  const filterIds = amenityFilter
    ? colored.filter(a => a.id === amenityFilter).map(a => a.id)
    : colored.map(a => a.id);

  const days: Record<string, string[]> = {};

  if (filterIds.length > 0) {
    const rows = await db
      .select({
        amenityId: bookings.amenityId,
        date: bookings.date,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          inArray(bookings.amenityId, filterIds),
          isNull(bookings.deletedAt),
          inArray(bookings.status, ['CONFIRMED', 'WAITLISTED']),
          gte(bookings.date, monthStart),
          lt(bookings.date, monthEnd)
        )
      );

    // Amenity order for capping dots by sort_order
    const orderIndex = new Map(colored.map((a, i) => [a.id, i]));

    for (const row of rows) {
      if (!row.amenityId || !row.date) continue;
      const key =
        row.date instanceof Date
          ? formatDateKey(row.date)
          : formatDateKey(new Date(String(row.date)));
      if (!days[key]) days[key] = [];
      if (!days[key].includes(row.amenityId)) {
        days[key].push(row.amenityId);
      }
    }

    for (const key of Object.keys(days)) {
      days[key].sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
      if (days[key].length > CALENDAR_DOT_CAP) {
        days[key] = days[key].slice(0, CALENDAR_DOT_CAP);
      }
    }
  }

  return apiSuccess({
    year,
    month,
    amenities: colored.map(a => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      sortOrder: a.sortOrder,
      colorIndex: a.colorIndex,
      colorHex: a.calendarColor.hex,
      colorKey: a.calendarColor.key,
      hoursOpen: a.hoursOpen,
      hoursClose: a.hoursClose,
      slotDurationMins: a.slotDurationMins,
      // Full amenity fields for BookingDetail handoff
      photoUrl: a.photoUrl,
      rulesText: a.rulesText,
      bookable: a.bookable,
      maxOccupancy: a.maxOccupancy,
      waitlistEnabled: a.waitlistEnabled,
      contactEnabled: a.contactEnabled,
      contactPhone: a.contactPhone,
      description: a.description,
      active: a.active,
      tenantId: a.tenantId,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      deletedAt: a.deletedAt,
    })),
    days,
    dotCap: CALENDAR_DOT_CAP,
  });
});
