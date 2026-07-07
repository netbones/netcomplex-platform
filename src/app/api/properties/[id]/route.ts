import {
  auth,
  db,
  properties,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  now,
  notDeleted,
  withErrorHandler,
} from '@api/server';

import { hasPermission } from '@shared/lib';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

export const GET = withErrorHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.tenantId, tenantId), notDeleted(properties)))
      .limit(1);

    if (!property) return apiNotFound('Property not found');

    return apiSuccess(property);
  }
);

export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    if (!hasPermission(session.user.role as string, 'users')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();

    const [property] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.tenantId, tenantId), notDeleted(properties)))
      .limit(1);

    if (!property) return apiNotFound('Property not found');

    await db
      .update(properties)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(eq(properties.id, property.id));

    return apiSuccess({ success: true });
  }
);
