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

/** @deprecated Use `trpc.bookings.cancelBooking` instead */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    if (!hasPermission(session.user.role as string, 'bookings')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId), notDeleted(bookings)))
      .limit(1);

    if (!booking) return apiNotFound('Booking not found');

    await db
      .update(bookings)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(eq(bookings.id, booking.id));

    return apiSuccess({ success: true });
  }
);
