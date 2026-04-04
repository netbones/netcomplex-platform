import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
// Import directly from drizzle schema files
import { maintenanceRequests } from '../../../../../prisma/drizzle/maintenance-requests';
import { users } from '../../../../../prisma/drizzle/users';
import { standardSeats } from '../../../../../prisma/drizzle/standard-seats';
import { households } from '../../../../../prisma/drizzle/households';
import { eq } from 'drizzle-orm';

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

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');

  // Get the request first to check ownership
  const [mrRow] = await db
    .select()
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.id, id))
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
  const body = await request.json();

  // Use Drizzle to update
  const now = new Date();
  const [maintenanceRequest] = await db
    .update(maintenanceRequests)
    .set({
      status: body.status,
      updatedAt: now,
    })
    .where(eq(maintenanceRequests.id, id))
    .returning();

  return NextResponse.json(maintenanceRequest);
}

/**
 * DELETE /api/maintenance/[id] - Not implemented (would need separate endpoint)
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Use Drizzle to delete
  await db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));

  return NextResponse.json({ success: true });
}
