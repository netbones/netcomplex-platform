import {
  auth,
  db,
  users,
  maintenanceRequests,
  bookings,
  conversations,
  conversationParticipants,
  notifications,
  apiError,
  apiSuccess,
  apiUnauthorized,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@/entities/tenant/api/with-tenant';

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

export async function GET(request: Request) {
  const { tenantId } = await withTenant();
  const userId = await getUserId(request);

  if (!userId) {
    return apiUnauthorized();
  }

  // Count maintenance requests for user
  const userRequests = await db
    .select({ id: maintenanceRequests.id })
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.userId, userId), eq(maintenanceRequests.tenantId, tenantId)));
  const requests = userRequests.length;

  // Count bookings where user is owner or participant
  const userBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.tenantId, tenantId)));
  const bookingsCount = userBookings.length;

  // Count conversations user participates in
  const userConversations = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.userId, userId),
        eq(conversationParticipants.tenantId, tenantId)
      )
    );
  const conversationsCount = userConversations.length;

  // Count notifications for user
  const userNotifications = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)));
  const notificationsCount = userNotifications.length;

  const stats: DashboardStats = {
    requests,
    bookings: bookingsCount,
    messages: conversationsCount,
    notifications: notificationsCount,
  };

  return apiSuccess(stats);
}
