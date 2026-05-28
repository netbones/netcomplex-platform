import { auth } from '@api/auth';
import { db, events, users } from '@api/db';
import { eq, and, desc, asc, gte } from 'drizzle-orm';
import { revalidateContent } from '@api/revalidation';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { hasPermission } from '@entities/tenant/api/permissions';

import { apiCreated, apiError, apiForbidden, apiSuccess, apiUnauthorized } from '@api/api-response';
/**
 * Retrieves session and role from the request for API routes.
 * @param request - Incoming HTTP request
 * @returns Session data with user ID and role, or null if not authenticated
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: user?.role || 'RESIDENT',
  };
}

/**
 * GET /api/events - List all events for the tenant
 * Returns events ordered by date descending.
 * Query params:
 *   - limit: number of events to return
 *   - upcoming: if "true", filter to events with date >= now, sorted ascending
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const upcomingParam = url.searchParams.get('upcoming');

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const upcoming = upcomingParam === 'true';

  let eventItems: (typeof events.$inferSelect)[];

  if (upcoming) {
    const now = new Date();
    const query = db
      .select()
      .from(events)
      .where(and(eq(events.tenantId, tenantId), gte(events.date, now)))
      .orderBy(asc(events.date));

    eventItems = limit ? await query.limit(limit) : await query;
  } else {
    const query = db
      .select()
      .from(events)
      .where(eq(events.tenantId, tenantId))
      .orderBy(desc(events.date));

    eventItems = limit ? await query.limit(limit) : await query;
  }

  return apiSuccess(eventItems);
}

/**
 * POST /api/events - Create a new event
 * Validates required fields and creates event with tenant isolation.
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'content') && !hasPermission(authData.role, 'contentOwn')) {
    return apiForbidden();
  }

  const body = await request.json();

  // Validate required fields
  if (!body.title || !body.description || !body.date || !body.location || !body.organizer) {
    return apiSuccess(
      { error: 'Missing required fields: title, description, date, location, organizer' },
      { status: 400 }
    );
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const now = new Date();

  const [event] = await db
    .insert(events)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      title: body.title,
      description: body.description,
      date: new Date(body.date),
      location: body.location,
      organizer: body.organizer,
      image: body.image || null,
      isPublic: body.isPublic !== undefined ? body.isPublic : true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Revalidate content caches
  revalidateContent();

  return apiCreated(event);
}
