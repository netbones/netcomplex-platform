import {
  db,
  competitions,
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

import { withTenant } from '@entities/tenant';

import { hasPermission } from '@shared/lib';

/**
 * GET /api/competitions/[id] - Get single competition by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [competition] = await db
    .select()
    .from(competitions)
    .where(and(eq(competitions.id, id), eq(competitions.tenantId, tenantId)))
    .limit(1);

  if (!competition) {
    return apiNotFound('Not found');
  }

  return apiSuccess(competition);
}

/**
 * PATCH /api/competitions/[id] - Update competition by ID
 * Accepts partial updates. Returns updated competition.
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
  if (body.rules !== undefined) updateData.rules = body.rules;
  if (body.prizeInfo !== undefined) updateData.prizeInfo = body.prizeInfo;
  if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
  if (body.status !== undefined) updateData.status = body.status;
  if (body.image !== undefined) updateData.image = body.image || null;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.winnersCount !== undefined) updateData.winnersCount = body.winnersCount;
  if (body.maxParticipants !== undefined) updateData.maxParticipants = body.maxParticipants || null;

  const [competition] = await db
    .update(competitions)
    .set(updateData)
    .where(and(eq(competitions.id, id), eq(competitions.tenantId, tenantId)))
    .returning();

  if (!competition) {
    return apiNotFound('Not found');
  }

  // Revalidate content caches
  revalidateContent();

  return apiSuccess(competition);
}

/**
 * DELETE /api/competitions/[id] - Delete competition by ID
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

  const [competition] = await db
    .delete(competitions)
    .where(and(eq(competitions.id, id), eq(competitions.tenantId, tenantId)))
    .returning();

  if (!competition) {
    return apiNotFound('Not found');
  }

  // Revalidate content caches
  revalidateContent();

  return apiSuccess({ success: true });
}
