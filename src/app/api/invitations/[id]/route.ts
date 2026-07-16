import {
  db,
  invitations,
  apiSuccess,
  apiUnauthorized,
  getSessionAndRole,
  now,
  withErrorHandler,
  guardSuspension,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { notDeleted } from '@api/server';

export const maxDuration = 8;

export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const authData = await getSessionAndRole(request);
    if (!authData) return apiUnauthorized();
    const guard = guardSuspension(authData);
    if (guard) return guard;

    const { tenantId } = await withTenant();
    const { id } = await params;
    await db
      .update(invitations)
      .set({ deletedAt: now() })
      .where(
        and(eq(invitations.id, id), eq(invitations.tenantId, tenantId), notDeleted(invitations))
      );
    return apiSuccess({ success: true });
  }
);
