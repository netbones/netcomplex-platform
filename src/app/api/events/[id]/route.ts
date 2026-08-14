import {
  db,
  events,
  users,
  revalidateContent,
  auth,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  notDeleted,
  apiGone,
  now,
  withErrorHandler,
} from '@api/server';

import { eq, and } from 'drizzle-orm';

import { withTenant } from '@entities/tenant/server';

import { hasPermission } from '@shared/lib';

export const maxDuration = 8;

/**
 * GET /api/events/[id] - Get single event by ID
 * @deprecated Use `trpc.events.getEvent` instead
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const [event] = await db
      .select()
      .from(events)
      .where(and(notDeleted(events), eq(events.id, id), eq(events.tenantId, tenantId)))
      .limit(1);

    if (!event) {
      return apiNotFound('Not found');
    }

    // Residents can only view public (non-draft) events or their own events.
    const isManagement = hasPermission(user?.role || 'RESIDENT', 'content');
    if (
      !isManagement &&
      event.createdByUserId !== session.user.id &&
      (!event.isPublic || event.isDraft)
    ) {
      return apiNotFound('Not found');
    }

    return apiSuccess(event);
  }
);

/**
 * PATCH /api/events/[id] - Update event by ID
 * Accepts partial updates. Returns updated event.
 * @deprecated Use `trpc.events.updateEvent` instead
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (
      !hasPermission(user?.role || 'RESIDENT', 'content') &&
      !hasPermission(user?.role || 'RESIDENT', 'contentOwn')
    ) {
      return apiForbidden();
    }

    const body = await request.json();

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const [existing] = await db
      .select({ deletedAt: events.deletedAt, createdByUserId: events.createdByUserId })
      .from(events)
      .where(and(eq(events.id, id), eq(events.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return apiNotFound('Not found');
    }

    if (existing.deletedAt) {
      return apiGone('This record has been deleted');
    }

    // Management can edit any event; residents can only edit their own.
    const isManagement = hasPermission(user?.role || 'RESIDENT', 'content');
    if (!isManagement && existing.createdByUserId !== session.user.id) {
      return apiForbidden();
    }

    const updateData: Record<string, unknown> = {
      updatedAt: now(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.date !== undefined) updateData.date = new Date(body.date);
    if (body.endDate !== undefined)
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.organizer !== undefined) updateData.organizer = body.organizer;
    if (body.image !== undefined) updateData.image = body.image || null;
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
    if (body.isDraft !== undefined) updateData.isDraft = body.isDraft;
    if (body.category !== undefined) updateData.category = body.category ?? null;
    if (body.maxAttendees !== undefined)
      updateData.maxAttendees = body.maxAttendees ? parseInt(body.maxAttendees, 10) : null;

    const [event] = await db
      .update(events)
      .set(updateData)
      .where(and(eq(events.id, id), eq(events.tenantId, tenantId)))
      .returning();

    if (!event) {
      return apiNotFound('Not found');
    }

    // Revalidate content caches
    revalidateContent();

    return apiSuccess(event);
  }
);

/**
 * DELETE /api/events/[id] - Delete event by ID
 * @deprecated Use `trpc.events.deleteEvent` instead
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (
      !hasPermission(user?.role || 'RESIDENT', 'content') &&
      !hasPermission(user?.role || 'RESIDENT', 'contentOwn')
    ) {
      return apiForbidden();
    }

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const [existing] = await db
      .select({ createdByUserId: events.createdByUserId })
      .from(events)
      .where(and(eq(events.id, id), eq(events.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return apiNotFound('Not found');
    }

    // Management can cancel any event; residents can only cancel their own.
    const isManagement = hasPermission(user?.role || 'RESIDENT', 'content');
    if (!isManagement && existing.createdByUserId !== session.user.id) {
      return apiForbidden();
    }

    const [event] = await db
      .update(events)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(and(eq(events.id, id), eq(events.tenantId, tenantId)))
      .returning();

    if (!event) {
      return apiNotFound('Not found');
    }

    // Revalidate content caches
    revalidateContent();

    return apiSuccess({ success: true });
  }
);
