import {
  auth,
  db,
  serviceBookings,
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

    const [booking] = await db
      .select()
      .from(serviceBookings)
      .where(
        and(eq(serviceBookings.id, id), eq(serviceBookings.tenantId, tenantId), notDeleted(serviceBookings))
      )
      .limit(1);

    if (!booking) return apiNotFound('Service booking not found');

    return apiSuccess(booking);
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

    const [booking] = await db
      .select({ id: serviceBookings.id })
      .from(serviceBookings)
      .where(
        and(eq(serviceBookings.id, id), eq(serviceBookings.tenantId, tenantId), notDeleted(serviceBookings))
      )
      .limit(1);

    if (!booking) return apiNotFound('Service booking not found');

    await db
      .update(serviceBookings)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(eq(serviceBookings.id, booking.id));

    return apiSuccess({ success: true });
  }
);
