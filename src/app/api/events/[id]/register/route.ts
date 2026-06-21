import {
  auth,
  db,
  eventAttendees,
  users,
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiNotFound,
  apiConflict,
  withErrorHandler,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

/**
 * GET /api/events/[id]/register - List attendees for an event
 * Returns { attendees, registered } where `registered` indicates if the
 * current user is among the attendees.
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
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const { tenantId } = await withTenant();
    const userId = session.user.id;

    const [existing] = await db
      .select({ id: eventAttendees.id })
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, id), eq(eventAttendees.userId, userId)))
      .limit(1);

    if (existing) {
      return apiConflict('Already registered for this event');
    }

    const [attendee] = await db
      .insert(eventAttendees)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        eventId: id,
        userId,
      })
      .returning();

    return apiSuccess(attendee);
  }
);

/**
 * DELETE /api/events/[id]/register - Unregister current user from an event
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const userId = session.user.id;

    const [deleted] = await db
      .delete(eventAttendees)
      .where(and(eq(eventAttendees.eventId, id), eq(eventAttendees.userId, userId)))
      .returning();

    if (!deleted) return apiNotFound('Not registered for this event');

    return apiSuccess({ success: true });
  }
);
