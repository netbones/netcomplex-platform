import { NextRequest } from 'next/server';
import {
  auth,
  db,
  users,
  resources,
  apiSuccess,
  apiForbidden,
  apiNotFound,
  withErrorHandler,
  notDeleted,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';

export const maxDuration = 8;

async function getSessionAndRole(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return null;

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return { userId: session.user.id, role: user?.role || 'RESIDENT' };
}

export const GET = withErrorHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();

    const [row] = await db
      .select()
      .from(resources)
      .where(and(eq(resources.id, id), eq(resources.category, 'EDUCATION'), notDeleted(resources)))
      .limit(1);

    if (!row || row.tenantId !== tenantId) {
      return apiNotFound('Resource not found');
    }

    return apiSuccess(row);
  }
);

export const PATCH = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authData = await getSessionAndRole(request);
    if (!authData || !hasPermission(authData.role, 'admin')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(resources)
      .where(and(eq(resources.id, id), eq(resources.category, 'EDUCATION'), notDeleted(resources)))
      .limit(1);

    if (!existing || existing.tenantId !== tenantId) {
      return apiNotFound('Resource not found');
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.externalUrl !== undefined) updates.externalUrl = body.externalUrl;
    if (body.provider !== undefined) updates.provider = body.provider;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.mediaType !== undefined) updates.mediaType = body.mediaType;
    if (body.featured !== undefined) updates.featured = body.featured;

    await db.update(resources).set(updates).where(eq(resources.id, id));

    const [updated] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
    return apiSuccess(updated);
  }
);

export const DELETE = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authData = await getSessionAndRole(request);
    if (!authData || !hasPermission(authData.role, 'admin')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();

    const [existing] = await db
      .select()
      .from(resources)
      .where(and(eq(resources.id, id), eq(resources.category, 'EDUCATION'), notDeleted(resources)))
      .limit(1);

    if (!existing || existing.tenantId !== tenantId) {
      return apiNotFound('Resource not found');
    }

    await db.update(resources).set({ deletedAt: new Date() }).where(eq(resources.id, id));
    return apiSuccess({ deleted: true });
  }
);
