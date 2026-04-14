import {
  db,
  maintenanceRequests,
  users,
  standardSeats,
  households,
  requestHistories,
} from '@api/db';
import { NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { hasPermission } from '@api/permissions';
import { eq, and } from 'drizzle-orm';
import { revalidateDashboard } from '@api/revalidation';
import { withTenant } from '@api/tenant';

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const [userResult] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult?.role || 'RESIDENT',
  };
}

/**
 * GET /api/maintenance/[id] - Get a single maintenance request by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');

  // Get the request first to check ownership and tenant
  const [mrRow] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!mrRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Check if user can view this request
  if (!canViewAll && mrRow.userId !== authData.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get user info and address
  const [uRow] = await db.select().from(users).where(eq(users.id, mrRow.userId)).limit(1);

  let address = null;
  if (canViewAll && uRow) {
    // Get household address through standardSeats
    const [ssRow] = await db
      .select()
      .from(standardSeats)
      .where(eq(standardSeats.userId, mrRow.userId))
      .limit(1);

    if (ssRow?.householdId) {
      const [hhRow] = await db
        .select()
        .from(households)
        .where(eq(households.id, ssRow.householdId))
        .limit(1);

      if (hhRow) {
        address = { street: hhRow.street, unit: hhRow.unit };
      }
    }
  }

  return NextResponse.json({
    id: mrRow.id,
    userId: mrRow.userId,
    category: mrRow.category,
    priority: mrRow.priority,
    description: mrRow.description,
    status: mrRow.status,
    images: mrRow.images,
    assignedTo: mrRow.assignedTo,
    vendor: mrRow.vendor,
    scheduledDate: mrRow.scheduledDate,
    estimatedCost: mrRow.estimatedCost,
    actualCost: mrRow.actualCost,
    resolution: mrRow.resolution,
    completedAt: mrRow.completedAt,
    createdAt: mrRow.createdAt,
    updatedAt: mrRow.updatedAt,
    user: uRow
      ? {
          name: uRow.name,
          email: uRow.email,
          address: address,
        }
      : null,
  });
}

/**
 * PATCH /api/maintenance/[id] - Update a maintenance request
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  // Get current request to compare values (with tenant check)
  const [existing] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const now = new Date();
  const updates: Record<string, unknown> = {
    updatedAt: now,
  };

  // Track changes for history
  if (body.status && body.status !== existing.status) {
    updates.status = body.status;
    if (body.status === 'COMPLETED') {
      updates.completedAt = now;
    }
    await db.insert(requestHistories).values({
      id: crypto.randomUUID(),
      requestId: id,
      userId: authData.userId,
      field: 'status',
      oldValue: existing.status,
      newValue: body.status,
      comment: body.comment || null,
    });
  }

  if (body.priority && body.priority !== existing.priority) {
    updates.priority = body.priority;
    await db.insert(requestHistories).values({
      id: crypto.randomUUID(),
      requestId: id,
      userId: authData.userId,
      field: 'priority',
      oldValue: existing.priority,
      newValue: body.priority,
      comment: body.comment || null,
    });
  }

  if (body.description && body.description !== existing.description) {
    updates.description = body.description;
  }

  if (body.assignedTo !== undefined && body.assignedTo !== existing.assignedTo) {
    updates.assignedTo = body.assignedTo || null;
    await db.insert(requestHistories).values({
      id: crypto.randomUUID(),
      requestId: id,
      userId: authData.userId,
      field: 'assignedTo',
      oldValue: existing.assignedTo || null,
      newValue: body.assignedTo || 'Unassigned',
      comment: body.comment || null,
    });
  }

  if (body.vendor !== undefined && body.vendor !== existing.vendor) {
    updates.vendor = body.vendor || null;
    await db.insert(requestHistories).values({
      id: crypto.randomUUID(),
      requestId: id,
      userId: authData.userId,
      field: 'vendor',
      oldValue: existing.vendor || null,
      newValue: body.vendor || 'None',
      comment: body.comment || null,
    });
  }

  if (body.scheduledDate !== undefined) {
    const newDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    const oldDate = existing.scheduledDate ? existing.scheduledDate.toISOString() : null;
    const newDateStr = newDate ? newDate.toISOString() : null;
    if (newDateStr !== oldDate) {
      updates.scheduledDate = newDate;
      await db.insert(requestHistories).values({
        id: crypto.randomUUID(),
        requestId: id,
        userId: authData.userId,
        field: 'scheduledDate',
        oldValue: oldDate ?? undefined,
        newValue: newDateStr ?? undefined,
        comment: body.comment || null,
      });
    }
  }

  if (body.estimatedCost !== undefined) {
    updates.estimatedCost = body.estimatedCost || null;
  }

  if (body.actualCost !== undefined) {
    updates.actualCost = body.actualCost || null;
  }

  if (body.resolution !== undefined && body.resolution !== existing.resolution) {
    updates.resolution = body.resolution || null;
  }

  const [maintenanceRequest] = await db
    .update(maintenanceRequests)
    .set(updates)
    .where(eq(maintenanceRequests.id, id))
    .returning();

  revalidateDashboard();

  return NextResponse.json(maintenanceRequest);
}

/**
 * DELETE /api/maintenance/[id] - Not implemented (would need separate endpoint)
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Use Drizzle to delete with tenant check
  await db
    .delete(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)));

  return NextResponse.json({ success: true });
}
