import {
  auth,
  db,
  events,
  eventAttendees,
  users,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiConflict,
  apiForbidden,
  withErrorHandler,
} from '@api/server';

import { eq, and, isNull, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/**
 * GET /api/events/[id]/register - List attendees for an event
 * Returns { attendees, registered } where `registered` indicates if the
 * current user is among the attendees.
 * @deprecated Use `trpc.events.listRegistrations` instead
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const { tenantId } = await withTenant();
    const userId = session.user.id;

    const attendees = await db
      .select({
        id: eventAttendees.id,
        userId: eventAttendees.userId,
        name: users.name,
        avatar: users.avatar,
        createdAt: eventAttendees.createdAt,
      })
      .from(eventAttendees)
      .innerJoin(users, eq(users.id, eventAttendees.userId))
      .where(and(eq(eventAttendees.eventId, id), eq(eventAttendees.tenantId, tenantId)))
      .orderBy(eventAttendees.createdAt);

    const registered = attendees.some(a => a.userId === userId);

    return apiSuccess({ attendees, registered });
  }
);

/**
 * POST /api/events/[id]/register - Register current user for an event
 * @deprecated Use `trpc.events.registerForEvent` instead
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const { tenantId } = await withTenant();
    const userId = session.user.id;

    const existing = await db
      .select({ id: eventAttendees.id })
      .from(eventAttendees)
      .where(
        and(
          eq(eventAttendees.eventId, id),
          eq(eventAttendees.userId, userId),
          eq(eventAttendees.tenantId, tenantId),
          isNull(eventAttendees.deletedAt)
        )
      )
      .limit(1)
      .then(rows => rows[0] ?? null);

    if (existing) {
      return apiConflict('Already registered for this event');
    }

    const event = await db
      .select({ maxAttendees: events.maxAttendees })
      .from(events)
      .where(and(eq(events.id, id), eq(events.tenantId, tenantId)))
      .limit(1)
      .then(rows => rows[0] ?? null);

    if (!event) {
      return apiNotFound('Event not found');
    }

    if (event.maxAttendees !== null) {
      const [{ count: currentCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(eventAttendees)
        .where(
          and(
            eq(eventAttendees.eventId, id),
            eq(eventAttendees.tenantId, tenantId),
            isNull(eventAttendees.deletedAt)
          )
        );

      if (currentCount >= event.maxAttendees) {
        return apiForbidden('Event has reached maximum capacity');
      }
    }

    const attendee = await db
      .insert(eventAttendees)
      .values({
        id: createId(),
        tenantId,
        eventId: id,
        userId,
      })
      .returning()
      .then(rows => rows[0] ?? null);

    return apiSuccess(attendee);
  }
);

/**
 * DELETE /api/events/[id]/register - Unregister current user from an event
 * @deprecated Use `trpc.events.cancelRegistration` instead
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const { tenantId } = await withTenant();
    const userId = session.user.id;

    const deleted = await db
      .delete(eventAttendees)
      .where(
        and(
          eq(eventAttendees.eventId, id),
          eq(eventAttendees.userId, userId),
          eq(eventAttendees.tenantId, tenantId)
        )
      )
      .returning()
      .then(rows => rows[0] ?? null);

    if (!deleted) return apiNotFound('Not registered for this event');

    return apiSuccess({ success: true });
  }
);
