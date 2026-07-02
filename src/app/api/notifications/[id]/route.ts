import {
  auth,
  db,
  notifications,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  notDeleted,
} from '@api/server';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await withTenant();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  const { id } = await params;

  const [notification] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, session.user.id),
        notDeleted(notifications)
      )
    )
    .limit(1);

  if (!notification) return apiNotFound('Notification not found');

  await db.update(notifications).set({ deletedAt: new Date() }).where(eq(notifications.id, id));

  return apiSuccess({ deleted: true });
}
