import { NextRequest } from 'next/server';
import {
  db,
  apiSuccess,
  apiError,
  apiInternalError,
  withErrorHandler,
  revalidateAmenities,
} from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { amenities } from '@/db/schema/amenities';
import { bookings } from '@/db/schema/bookings';
import { amenityAdminSchema, toAmenityColumns } from '@entities/amenity';
import { createId } from '@shared/lib/id';
import { createComponentLogger } from '@shared/lib';
import { and, asc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';

export const maxDuration = 8;

const log = createComponentLogger('admin-amenities-api');

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow(today: Date): Date {
  const d = new Date(today);
  d.setDate(d.getDate() + 1);
  return d;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('bookings');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const today = startOfToday();
  const tomorrow = startOfTomorrow(today);

  const rows = await db
    .select()
    .from(amenities)
    .where(and(eq(amenities.tenantId, tenantId), isNull(amenities.deletedAt)))
    .orderBy(asc(amenities.sortOrder), asc(amenities.name));

  const amenityIds = rows.map(r => r.id);

  const bookingsTodayByAmenity: Record<string, number> = {};
  const bookingCountByAmenity: Record<string, number> = {};
  let waitlistCount = 0;
  let bookingsTodayTotal = 0;

  if (amenityIds.length > 0) {
    const allCounts = await db
      .select({
        amenityId: bookings.amenityId,
        count: sql<number>`count(*)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          inArray(bookings.amenityId, amenityIds),
          isNull(bookings.deletedAt)
        )
      )
      .groupBy(bookings.amenityId);

    for (const row of allCounts) {
      if (row.amenityId) bookingCountByAmenity[row.amenityId] = row.count;
    }

    const todayRows = await db
      .select({
        amenityId: bookings.amenityId,
        status: bookings.status,
        count: sql<number>`count(*)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          inArray(bookings.amenityId, amenityIds),
          isNull(bookings.deletedAt),
          gte(bookings.date, today),
          lt(bookings.date, tomorrow),
          inArray(bookings.status, ['CONFIRMED', 'WAITLISTED'])
        )
      )
      .groupBy(bookings.amenityId, bookings.status);

    for (const row of todayRows) {
      if (!row.amenityId) continue;
      if (row.status === 'CONFIRMED') {
        bookingsTodayByAmenity[row.amenityId] =
          (bookingsTodayByAmenity[row.amenityId] ?? 0) + row.count;
        bookingsTodayTotal += row.count;
      } else if (row.status === 'WAITLISTED') {
        waitlistCount += row.count;
      }
    }
  }

  // No-show transition mechanism is still undecided — return null so UI shows "—"
  const noShowsThisWeek: number | null = null;

  const activeCount = rows.filter(r => r.active).length;

  return apiSuccess({
    amenities: rows.map(r => ({
      ...r,
      bookingsToday: r.bookable ? (bookingsTodayByAmenity[r.id] ?? 0) : null,
      bookingCount: bookingCountByAmenity[r.id] ?? 0,
    })),
    stats: {
      activeAmenities: activeCount,
      bookingsToday: bookingsTodayTotal,
      onWaitlist: waitlistCount,
      noShowsThisWeek,
    },
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('bookings');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const body = await request.json();
  const parsed = amenityAdminSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid amenity payload', 400, parsed.error.flatten());
  }

  const cols = toAmenityColumns(parsed.data);

  const maxSort = await db
    .select({ max: sql<number>`coalesce(max(${amenities.sortOrder}), -1)::int` })
    .from(amenities)
    .where(and(eq(amenities.tenantId, tenantId), isNull(amenities.deletedAt)));

  const id = createId();
  const now = new Date();

  try {
    await db.insert(amenities).values({
      id,
      tenantId,
      ...cols,
      sortOrder: (maxSort[0]?.max ?? -1) + 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  } catch (error) {
    log.error({ operation: 'POST' }, 'Failed to create amenity', error);
    return apiInternalError('Failed to create amenity');
  }

  const [created] = await db.select().from(amenities).where(eq(amenities.id, id)).limit(1);
  revalidateAmenities();
  return apiSuccess(created, undefined, 201);
});
