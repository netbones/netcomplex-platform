import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
// Import directly from drizzle schema files
import { maintenanceRequests } from '../../../../../prisma/drizzle/maintenance-requests';
import { users } from '../../../../../prisma/drizzle/users';
import { eq } from 'drizzle-orm';

/**
 * GET /api/maintenance/[id] - Get a single maintenance request by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Use Drizzle to get by ID
  const [maintenanceRequest] = await db
    .select()
    .from(maintenanceRequests)
    .leftJoin(users, eq(maintenanceRequests.userId, users.id))
    .where(eq(maintenanceRequests.id, id))
    .limit(1);

  if (!maintenanceRequest) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const mr = maintenanceRequest.MaintenanceRequest;
  const u = maintenanceRequest.user;

  return NextResponse.json({
    id: mr.id,
    userId: mr.userId,
    category: mr.category,
    priority: mr.priority,
    description: mr.description,
    status: mr.status,
    images: mr.images,
    createdAt: mr.createdAt,
    updatedAt: mr.updatedAt,
    user: u
      ? {
          name: u.name,
          email: u.email,
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
