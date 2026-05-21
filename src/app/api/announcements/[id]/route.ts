import { db, announcements, users, resources } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { revalidateDashboard } from '@api/revalidation';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { auth } from '@api/auth';
import { canPublishAnnouncements } from '@entities/tenant/api/permissions';
import { validatePriorityForRole } from '@features/announcements/model/priority-taxonomy';
import type { AnnouncementPriority } from '@features/announcements/model/priority-taxonomy';

/**
 * GET /api/announcements/[id] - Get single announcement by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [announcement] = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenantId)))
    .limit(1);

  if (!announcement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(announcement);
}

/**
 * PATCH /api/announcements/[id] - Update announcement by ID
 * Accepts partial updates. Applies priority enforcement if priority is changed.
 * Does NOT re-fanout notifications (fanout is creation-only).
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

  if (!canPublishAnnouncements(user?.role || 'RESIDENT')) {
    return NextResponse.json(
      { error: 'Forbidden — insufficient permissions to edit announcements' },
      { status: 403 }
    );
  }

  const body = await request.json();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Priority enforcement on PATCH
  let priorityDowngraded = false;
  let validatedPriority: AnnouncementPriority | undefined;

  if (body.priority) {
    validatedPriority = validatePriorityForRole(
      body.priority as AnnouncementPriority,
      user?.role || 'RESIDENT'
    );
    priorityDowngraded = validatedPriority !== body.priority;
  }

  // If resourceId is being updated, verify the Resource exists AND belongs to the same tenant
  if (body.resourceId) {
    const [resource] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(and(eq(resources.id, body.resourceId), eq(resources.tenantId, tenantId)))
      .limit(1);

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found or does not belong to this tenant' },
        { status: 400 }
      );
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.author !== undefined) updateData.author = body.author;
  if (validatedPriority !== undefined) updateData.priority = validatedPriority;
  else if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.targetFilter !== undefined) updateData.targetFilter = body.targetFilter;
  if (body.targetRoles !== undefined) updateData.targetRoles = body.targetRoles;
  if (body.resourceId !== undefined) updateData.resourceId = body.resourceId || null;
  if (body.expiresAt !== undefined)
    updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  const [announcement] = await db
    .update(announcements)
    .set(updateData)
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenantId)))
    .returning();

  if (!announcement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Revalidate dashboard caches
  revalidateDashboard();

  // Build response with optional priority downgrade warning
  const response: Record<string, unknown> = { ...announcement };
  if (priorityDowngraded && validatedPriority) {
    response.warning = `Priority downgraded from ${body.priority} to ${validatedPriority} — your role permits a maximum of ${validatedPriority}`;
  }

  return NextResponse.json(response);
}

/**
 * DELETE /api/announcements/[id] - Delete announcement by ID
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

  if (!canPublishAnnouncements(user?.role || 'RESIDENT')) {
    return NextResponse.json(
      { error: 'Forbidden — insufficient permissions to delete announcements' },
      { status: 403 }
    );
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [announcement] = await db
    .delete(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenantId)))
    .returning();

  if (!announcement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Revalidate dashboard caches
  revalidateDashboard();

  return NextResponse.json({ success: true });
}
