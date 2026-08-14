import { NextRequest } from 'next/server';
import { db, events, eventAttendees, apiSuccess, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

export const maxDuration = 8;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(d: Date): Date {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 7);
  return x;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('events');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();

  const rows = await db
    .select()
    .from(events)
    .where(eq(events.tenantId, tenantId))
    .orderBy(asc(events.date));

  const eventIds = rows.map(r => r.id);

  const counts =
    eventIds.length === 0
      ? []
      : await db
          .select({
            eventId: eventAttendees.eventId,
            count: sql<number>`count(*)::int`,
          })
          .from(eventAttendees)
          .where(
            and(
              eq(eventAttendees.tenantId, tenantId),
              inArray(eventAttendees.eventId, eventIds),
              isNull(eventAttendees.deletedAt)
            )
          )
          .groupBy(eventAttendees.eventId);

  const countMap = new Map(counts.map(c => [c.eventId, c.count]));

  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  let upcoming = 0;
  let thisWeek = 0;
  let totalRsvps = 0;
  let cancelled = 0;
  let drafts = 0;

  for (const row of rows) {
    const count = countMap.get(row.id) ?? 0;
    totalRsvps += count;

    if (row.deletedAt) {
      cancelled += 1;
      continue;
    }

    if (row.isDraft) {
      drafts += 1;
      continue;
    }

    const date = row.date.getTime();
    if (date >= weekStart.getTime() && date < weekEnd.getTime()) {
      thisWeek += 1;
    }
    if (date >= now.getTime()) {
      upcoming += 1;
    }
  }

  return apiSuccess({
    events: rows.map(r => ({ ...r, attendeeCount: countMap.get(r.id) ?? 0 })),
    stats: { upcoming, thisWeek, totalRsvps, cancelled, drafts },
  });
});
