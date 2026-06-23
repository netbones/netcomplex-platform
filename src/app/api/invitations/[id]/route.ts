import {
  db,
  invitations,
  apiSuccess,
  apiUnauthorized,
  getSessionAndRole,
  now,
  withErrorHandler,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const authData = await getSessionAndRole(request);
    if (!authData) return apiUnauthorized();

    const { tenantId } = await withTenant();
    const { id } = await params;
    await db
      .update(invitations)
      .set({ deletedAt: now() })
      .where(and(eq(invitations.id, id), eq(invitations.tenantId, tenantId)));
    return apiSuccess({ success: true });
  }
);
