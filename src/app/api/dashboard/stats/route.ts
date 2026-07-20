import {
  auth,
  db,
  maintenanceRequests,
  bookings,
  conversationParticipants,
  notifications,
  apiSuccess,
  apiUnauthorized,
  withErrorHandler,
} from '@api/server';

import { count, eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 5;

interface DashboardStats {
  requests: number;
  bookings: number;
  messages: number;
  notifications: number;
}

async function getUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  return session?.user?.id || null;
}

/**
 * @deprecated Use trpc.identity.getDashboardStats instead.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const { tenantId } = await withTenant();
  const userId = await getUserId(request);

  if (!userId) {
    return apiUnauthorized();
  }

  const [{ count: requests }] = await db
    .select({ count: count() })
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.userId, userId), eq(maintenanceRequests.tenantId, tenantId)));

  const [{ count: bookingsCount }] = await db
    .select({ count: count() })
    .from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.tenantId, tenantId)));

  const [{ count: conversationsCount }] = await db
    .select({ count: count() })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.userId, userId),
        eq(conversationParticipants.tenantId, tenantId)
      )
    );

  const [{ count: notificationsCount }] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)));

  const stats: DashboardStats = {
    requests,
    bookings: bookingsCount,
    messages: conversationsCount,
    notifications: notificationsCount,
  };

  return apiSuccess(stats);
});
