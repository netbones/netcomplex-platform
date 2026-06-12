import {
  db,
  events,
  users,
  revalidateContent,
  auth,
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
} from '@api/server';

import { eq, and } from 'drizzle-orm';

import { withTenant } from '@/entities/tenant/api/with-tenant';

import { hasPermission } from '@shared/lib';

/**
 * GET /api/events/[id] - Get single event by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.tenantId, tenantId)))
    .limit(1);

  if (!event) {
    return apiNotFound('Not found');
  }

  return apiSuccess(event);
}

/**
 * PATCH /api/events/[id] - Update event by ID
 * Accepts partial updates. Returns updated event.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.date !== undefined) updateData.date = new Date(body.date);
  if (body.location !== undefined) updateData.location = body.location;
  if (body.organizer !== undefined) updateData.organizer = body.organizer;
  if (body.image !== undefined) updateData.image = body.image || null;
  if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;

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

/**
 * DELETE /api/events/[id] - Delete event by ID
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const [event] = await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.tenantId, tenantId)))
    .returning();

  if (!event) {
    return apiNotFound('Not found');
  }

  // Revalidate content caches
  revalidateContent();

  return apiSuccess({ success: true });
}
