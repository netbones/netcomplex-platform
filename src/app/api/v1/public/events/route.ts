import { db, events, apiSuccess, withErrorHandler } from '@api/server';

import { eq, and, desc, asc, gte, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { toPublicEventDTO } from '@api/server';

export const maxDuration = 8;

/**
 * GET /api/v1/public/events
 * Public, unauthenticated endpoint for events.
 * Returns only events where isPublic = true, soft-deleted rows excluded.
 * @query limit - Max events to return
 * @query upcoming - If "true", filter to events with date >= now, sorted ascending
 */
export const GET = withErrorHandler(async (request: Request) => {
  const { tenantId } = await withTenant();

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const upcomingParam = url.searchParams.get('upcoming');

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const upcoming = upcomingParam === 'true';

  const conditions = [
    eq(events.tenantId, tenantId),
    eq(events.isPublic, true),
    isNull(events.deletedAt),
  ];

  if (upcoming) {
    conditions.push(gte(events.date, new Date()));
  }

  const query = db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(upcoming ? asc(events.date) : desc(events.date));

  const rows = limit ? await query.limit(limit) : await query;

  return apiSuccess(rows.map(toPublicEventDTO));
});
