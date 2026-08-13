import { unstable_cache } from 'next/cache';
import { db, CACHE_TAGS } from '@api/server';
import { amenities } from '@/db/schema/amenities';
import { bookings } from '@/db/schema/bookings';
import {
  assignCalendarColors,
  CALENDAR_DOT_CAP,
  formatDateKey,
  generateTimeSlots,
  parseDateKey,
} from '@entities/amenity';
import type { Amenity, AmenityCalendarColor } from '@entities/amenity';
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt } from 'drizzle-orm';

/** Catalog fallback TTL — primary freshness via `CACHE_TAGS.AMENITIES` invalidation. */
export const AMENITY_CATALOG_REVALIDATE_SECONDS = 600;

/** Availability / booking fallback TTL — also invalidated on booking mutations. */
export const AMENITY_AVAILABILITY_REVALIDATE_SECONDS = 30;

const AVAILABILITY_TAGS = [CACHE_TAGS.AMENITY_AVAILABILITY, CACHE_TAGS.BOOKINGS] as const;

type AmenityRow = typeof amenities.$inferSelect;

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

function normalizeAmenityRow(row: AmenityRow): Amenity {
  return {
    ...row,
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
    deletedAt: toDate(row.deletedAt),
  };
}

async function loadActiveAmenitiesCatalogImpl(tenantId: string): Promise<Amenity[]> {
  const results = await db
    .select()
    .from(amenities)
    .where(and(eq(amenities.tenantId, tenantId), eq(amenities.active, true)))
    .orderBy(asc(amenities.sortOrder));

  return results.map(normalizeAmenityRow);
}

export const getActiveAmenitiesCatalog = unstable_cache(
  loadActiveAmenitiesCatalogImpl,
  ['amenities-catalog'],
  {
    revalidate: AMENITY_CATALOG_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.AMENITIES],
  }
);

async function loadBookableAmenitiesImpl(tenantId: string): Promise<Amenity[]> {
  const results = await db
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

  return results.map(normalizeAmenityRow);
}

export const getBookableAmenities = unstable_cache(
  loadBookableAmenitiesImpl,
  ['amenities-bookable'],
  {
    revalidate: AMENITY_CATALOG_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.AMENITIES],
  }
);

export interface AmenityBookingSlot {
  startTime: string;
  endTime: string;
}

async function loadAmenityBookingsForDateImpl(
  tenantId: string,
  amenityId: string,
  dateStr: string
): Promise<AmenityBookingSlot[]> {
  const dateObj = parseDateKey(dateStr);

  return db
    .select({
      startTime: bookings.startTime,
      endTime: bookings.endTime,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.amenityId, amenityId),
        eq(bookings.date, dateObj),
        eq(bookings.status, 'CONFIRMED')
      )
    );
}

export const getAmenityBookingsForDate = unstable_cache(
  loadAmenityBookingsForDateImpl,
  ['amenity-bookings-for-date'],
  {
    revalidate: AMENITY_AVAILABILITY_REVALIDATE_SECONDS,
    tags: [...AVAILABILITY_TAGS],
  }
);

export interface UserAmenityBookingRow {
  id: string;
  amenityId: string | null;
  status: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  cancelledAt: Date | string | null;
  purpose: string | null;
  amenityName: string | null;
  amenityIcon: string | null;
}

async function loadUserAmenityBookingsImpl(
  tenantId: string,
  userId: string
): Promise<UserAmenityBookingRow[]> {
  return db
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
        eq(bookings.userId, userId),
        isNotNull(bookings.amenityId)
      )
    )
    .orderBy(desc(bookings.date), desc(bookings.startTime));
}

export const getUserAmenityBookings = unstable_cache(
  loadUserAmenityBookingsImpl,
  ['user-amenity-bookings'],
  {
    revalidate: AMENITY_AVAILABILITY_REVALIDATE_SECONDS,
    tags: [...AVAILABILITY_TAGS],
  }
);

export interface CalendarAmenity extends Amenity {
  calendarColor: AmenityCalendarColor;
  colorIndex: number;
}

export interface CalendarMonthPayload {
  year: number;
  month: number;
  amenities: CalendarAmenity[];
  days: Record<string, string[]>;
  dotCap: number;
}

async function loadCalendarMonthImpl(
  tenantId: string,
  year: number,
  month: number,
  amenityFilter: string
): Promise<CalendarMonthPayload> {
  const bookableRows = await loadBookableAmenitiesImpl(tenantId);
  const colored = assignCalendarColors(bookableRows);
  const filterIds = amenityFilter
    ? colored.filter(a => a.id === amenityFilter).map(a => a.id)
    : colored.map(a => a.id);

  const days: Record<string, string[]> = {};

  if (filterIds.length > 0) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

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

  return {
    year,
    month,
    amenities: colored,
    days,
    dotCap: CALENDAR_DOT_CAP,
  };
}

export const getCalendarMonth = unstable_cache(loadCalendarMonthImpl, ['amenity-calendar-month'], {
  revalidate: AMENITY_AVAILABILITY_REVALIDATE_SECONDS,
  tags: [...AVAILABILITY_TAGS],
});

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

async function loadCalendarDayAgendaImpl(
  tenantId: string,
  userId: string,
  dateStr: string,
  amenityFilter: string
): Promise<CalendarAgendaSlot[]> {
  const dayDate = parseDateKey(dateStr);
  const bookableRows = await loadBookableAmenitiesImpl(tenantId);
  const colored = assignCalendarColors(bookableRows);
  const scoped = amenityFilter ? colored.filter(a => a.id === amenityFilter) : colored;

  if (scoped.length === 0) return [];

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
        state = match.userId === userId ? 'mine' : 'booked';
      } else if (slot.available) {
        state = 'available';
      } else {
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

  return slots;
}

export const getCalendarDayAgenda = unstable_cache(
  loadCalendarDayAgendaImpl,
  ['amenity-calendar-day'],
  {
    revalidate: AMENITY_AVAILABILITY_REVALIDATE_SECONDS,
    tags: [...AVAILABILITY_TAGS],
  }
);
