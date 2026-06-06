import { db, invitations } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';

import { apiError, apiSuccess } from '@api/api-response';
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await withTenant();
  const { id } = await params;
  await db
    .delete(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.tenantId, tenantId)));
  return apiSuccess({ success: true });
}
