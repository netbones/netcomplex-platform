import {
  auth,
  db,
  bookings,
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

/** @deprecated Use `trpc.bookings.getBooking` instead */
export const GET = withErrorHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId), notDeleted(bookings)))
      .limit(1);

    if (!booking) return apiNotFound('Booking not found');

    return apiSuccess(booking);
  }
);

/**
 * Cancel a booking — sets status = CANCELLED and cancelledAt = now().
 * Residents can only cancel their own bookings; management/admin cancel any.
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const { tenantId } = await withTenant();

    const [booking] = await db
      .select({ id: bookings.id, userId: bookings.userId, status: bookings.status })
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId), notDeleted(bookings)))
      .limit(1);

    if (!booking) return apiNotFound('Booking not found');

    const canManageAll = hasPermission(session.user.role as string, 'bookings');
    if (!canManageAll && booking.userId !== session.user.id) {
      return apiForbidden();
    }

    await db
      .update(bookings)
      .set({ status: 'CANCELLED', cancelledAt: now(), updatedAt: now() })
      .where(eq(bookings.id, booking.id));

    return apiSuccess({ success: true });
  }
);
