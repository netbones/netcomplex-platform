import {
  auth,
  db,
  users,
  eventAttendees,
  revalidateContent,
  apiCreated,
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
} from '@api/server';

import { eq, inArray, and, sql } from 'drizzle-orm';

import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { listEvents, createEvent, validateEventFields } from '@entities/event/server';

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
 * Enriches an event list with attendee info and registration status.
 */
async function enrichWithAttendees(events: Array<Record<string, unknown>>, userId: string) {
  if (events.length === 0) return events;

  const eventIds = events.map(e => e.id as string);

  const attendeeCounts = await db
    .select({
      eventId: eventAttendees.eventId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(eventAttendees)
    .where(inArray(eventAttendees.eventId, eventIds))
    .groupBy(eventAttendees.eventId);

  const countMap = new Map(attendeeCounts.map(a => [a.eventId, a.count]));

  const userRegistrations = await db
    .select({ eventId: eventAttendees.eventId })
    .from(eventAttendees)
    .where(and(inArray(eventAttendees.eventId, eventIds), eq(eventAttendees.userId, userId)));

  const registeredSet = new Set(userRegistrations.map(r => r.eventId));

  const attendees = await db
    .select({
      eventId: eventAttendees.eventId,
      name: users.name,
      avatar: users.avatar,
    })
    .from(eventAttendees)
    .innerJoin(users, eq(users.id, eventAttendees.userId))
    .where(inArray(eventAttendees.eventId, eventIds))
    .orderBy(eventAttendees.createdAt);

  const attendeesByEvent = new Map<string, { name: string; avatar: string | null }[]>();
  for (const a of attendees) {
    const list = attendeesByEvent.get(a.eventId) ?? [];
    if (list.length < 3) list.push({ name: a.name, avatar: a.avatar });
    attendeesByEvent.set(a.eventId, list);
  }

  return events.map(event => ({
    ...event,
    registered: registeredSet.has(event.id as string),
    attendeeCount: countMap.get(event.id as string) ?? 0,
    attendees: attendeesByEvent.get(event.id as string) ?? [],
  }));
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

  // Delegate to entity service
  const eventItems = await listEvents({ tenantId, limit, upcoming });

  const enriched = await enrichWithAttendees(
    eventItems as Array<Record<string, unknown>>,
    authData.userId
  );

  return apiSuccess(enriched);
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

  // Validate required fields using service
  const validation = validateEventFields(body);
  if (!validation.valid) {
    return apiSuccess(
      {
        error: `Missing required fields: ${validation.missing?.join(', ')}`,
      },
      undefined,
      400
    );
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Delegate to entity service for creation
  const event = await createEvent({
    id: crypto.randomUUID(),
    tenantId,
    title: body.title,
    description: body.description,
    date: new Date(body.date),
    location: body.location,
    organizer: body.organizer,
    image: body.image || null,
    isPublic: body.isPublic !== undefined ? body.isPublic : true,
  });

  // Revalidate content caches
  revalidateContent();

  return apiCreated(event);
}
