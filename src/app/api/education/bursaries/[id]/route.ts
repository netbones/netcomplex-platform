import {
  auth,
  db,
  users,
  apiSuccess,
  apiForbidden,
  apiNotFound,
  withErrorHandler,
  bursaries,
  notDeleted,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';

export const maxDuration = 8;

async function getSessionAndRole(request: Request) {
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
  async (_request: Request, { params }: { params: { id: string } }) => {
    const { tenantId } = await withTenant();

    const [row] = await db
      .select()
      .from(bursaries)
      .where(and(eq(bursaries.id, params.id), notDeleted(bursaries)))
      .limit(1);

    if (!row || row.tenantId !== tenantId) {
      return apiNotFound('Bursary not found');
    }

    return apiSuccess(row);
  }
);

export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: { id: string } }) => {
    const authData = await getSessionAndRole(request);
    if (!authData || !hasPermission(authData.role, 'admin')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(bursaries)
      .where(and(eq(bursaries.id, params.id), notDeleted(bursaries)))
      .limit(1);

    if (!existing || existing.tenantId !== tenantId) {
      return apiNotFound('Bursary not found');
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.funder !== undefined) updates.funder = body.funder;
    if (body.fieldId !== undefined) updates.fieldId = body.fieldId;
    if (body.amount !== undefined) updates.amount = body.amount;
    if (body.description !== undefined) updates.description = body.description;
    if (body.applyUrl !== undefined) updates.applyUrl = body.applyUrl;
    if (body.deadline !== undefined) updates.deadline = new Date(body.deadline);
    if (body.status !== undefined) updates.status = body.status;

    await db.update(bursaries).set(updates).where(eq(bursaries.id, params.id));

    const [updated] = await db.select().from(bursaries).where(eq(bursaries.id, params.id)).limit(1);
    return apiSuccess(updated);
  }
);

export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: { id: string } }) => {
    const authData = await getSessionAndRole(request);
    if (!authData || !hasPermission(authData.role, 'admin')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();

    const [existing] = await db
      .select()
      .from(bursaries)
      .where(and(eq(bursaries.id, params.id), notDeleted(bursaries)))
      .limit(1);

    if (!existing || existing.tenantId !== tenantId) {
      return apiNotFound('Bursary not found');
    }

    await db.update(bursaries).set({ deletedAt: new Date() }).where(eq(bursaries.id, params.id));
    return apiSuccess({ deleted: true });
  }
);
