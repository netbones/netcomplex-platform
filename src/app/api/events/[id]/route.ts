import { db, events, users } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { revalidateContent } from '@api/revalidation';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';

/**
 * GET /api/events/[id] - Get single event by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.tenantId, tenantId)))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(event);
}

/**
 * PATCH /api/events/[id] - Update event by ID
 * Accepts partial updates. Returns updated event.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Revalidate content caches
  revalidateContent();

  return NextResponse.json(event);
}

/**
 * DELETE /api/events/[id] - Delete event by ID
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [event] = await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.tenantId, tenantId)))
    .returning();

  if (!event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Revalidate content caches
  revalidateContent();

  return NextResponse.json({ success: true });
}
