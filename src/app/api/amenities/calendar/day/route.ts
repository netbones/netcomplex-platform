import { NextRequest } from 'next/server';
import { db, apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { amenities } from '@/db/schema/amenities';
import { bookings } from '@/db/schema/bookings';
import { assignCalendarColors, generateTimeSlots, parseDateKey } from '@entities/amenity';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

export const maxDuration = 8;

export type CalendarAgendaState = 'available' | 'booked' | 'mine';

export interface CalendarAgendaSlot {
  amenityId: string;
  amenityName: string;
  colorHex: string;
  colorKey: string;
  startTime: string;
  endTime: string;
  state: CalendarAgendaState;
}

/**
 * GET /api/amenities/calendar/day?date=YYYY-MM-DD&amenityId=optional
 * Day agenda: chronological slots across bookable amenities.
 * Privacy: other residents' bookings are "booked" only — never name/unit/userId.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('bookings');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  const amenityFilter = searchParams.get('amenityId');

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return apiError('VALIDATION_ERROR', 'date (YYYY-MM-DD) is required', 400);
  }

  const dayDate = parseDateKey(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dayDate < today) {
    return apiError('VALIDATION_ERROR', 'Past days are not available on this calendar', 400);
  }

  const bookableRows = await db
    .select()
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
  const scoped = amenityFilter ? colored.filter(a => a.id === amenityFilter) : colored;

  if (scoped.length === 0) {
    return apiSuccess({ date: dateStr, slots: [] as CalendarAgendaSlot[] });
  }

  const amenityIds = scoped.map(a => a.id);

  const bookingRows = await db
    .select({
      amenityId: bookings.amenityId,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      userId: bookings.userId,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        inArray(bookings.amenityId, amenityIds),
        eq(bookings.date, dayDate),
        isNull(bookings.deletedAt),
        inArray(bookings.status, ['CONFIRMED', 'WAITLISTED'])
      )
    );

  const slots: CalendarAgendaSlot[] = [];

  for (const amenity of scoped) {
    if (!amenity.slotDurationMins) continue;

    const amenityBookings = bookingRows.filter(b => b.amenityId === amenity.id);
    const existing = amenityBookings.map(b => ({
      startTime: b.startTime,
      endTime: b.endTime,
    }));

    const generated = generateTimeSlots(
      amenity.hoursOpen,
      amenity.hoursClose,
      amenity.slotDurationMins,
      dayDate,
      existing
    );

    const endFor = (start: string) => {
      const [h, m] = start.split(':').map(Number);
      const total = h * 60 + m + (amenity.slotDurationMins ?? 60);
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    for (const slot of generated) {
      const match = amenityBookings.find(b => b.startTime === slot.time);
      let state: CalendarAgendaState;
      if (match) {
        state = match.userId === auth.data.userId ? 'mine' : 'booked';
      } else if (slot.available) {
        state = 'available';
      } else {
        // Past slot with no booking — skip (nothing useful to show)
        continue;
      }

      slots.push({
        amenityId: amenity.id,
        amenityName: amenity.name,
        colorHex: amenity.calendarColor.hex,
        colorKey: amenity.calendarColor.key,
        startTime: slot.time,
        endTime: match?.endTime ?? endFor(slot.time),
        state,
      });
    }
  }

  slots.sort(
    (a, b) => a.startTime.localeCompare(b.startTime) || a.amenityName.localeCompare(b.amenityName)
  );

  return apiSuccess({
    date: dateStr,
    slots,
    // Echo key for client sanity — never include other users
    viewerUserId: undefined,
  });
});
