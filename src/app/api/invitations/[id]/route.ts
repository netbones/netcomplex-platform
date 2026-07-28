import { db, invitations, apiSuccess, now, withErrorHandler } from '@api/server';

import { requireAuth } from '@/shared/api/auth-utils';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { notDeleted } from '@api/server';

export const maxDuration = 8;

/**
 * @deprecated Use trpc.invitations.cancelInvitation instead.
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

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
