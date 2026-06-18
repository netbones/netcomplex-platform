import { db, invitations, apiError, apiSuccess, apiGone, notDeleted } from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await withTenant();
  const { id } = await params;
  await db
    .update(invitations)
    .set({ deletedAt: new Date() })
    .where(and(eq(invitations.id, id), eq(invitations.tenantId, tenantId)));
  return apiSuccess({ success: true });
}
