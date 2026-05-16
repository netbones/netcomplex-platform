import { db, competitions, users } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { revalidateContent } from '@api/revalidation';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';

/**
 * GET /api/competitions/[id] - Get single competition by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [competition] = await db
    .select()
    .from(competitions)
    .where(and(eq(competitions.id, id), eq(competitions.tenantId, tenantId)))
    .limit(1);

  if (!competition) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(competition);
}

/**
 * PATCH /api/competitions/[id] - Update competition by ID
 * Accepts partial updates. Returns updated competition.
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
  if (body.rules !== undefined) updateData.rules = body.rules;
  if (body.prizeInfo !== undefined) updateData.prizeInfo = body.prizeInfo;
  if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
  if (body.status !== undefined) updateData.status = body.status;
  if (body.image !== undefined) updateData.image = body.image || null;

  const [competition] = await db
    .update(competitions)
    .set(updateData)
    .where(and(eq(competitions.id, id), eq(competitions.tenantId, tenantId)))
    .returning();

  if (!competition) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Revalidate content caches
  revalidateContent();

  return NextResponse.json(competition);
}

/**
 * DELETE /api/competitions/[id] - Delete competition by ID
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

  const [competition] = await db
    .delete(competitions)
    .where(and(eq(competitions.id, id), eq(competitions.tenantId, tenantId)))
    .returning();

  if (!competition) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Revalidate content caches
  revalidateContent();

  return NextResponse.json({ success: true });
}
