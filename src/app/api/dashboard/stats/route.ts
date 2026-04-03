import { auth } from '@/lib/auth';
import {
  db,
  users,
  maintenanceRequests,
  bookings,
  conversations,
  conversationParticipants,
  notifications,
} from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

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
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Count maintenance requests for user
  const userRequests = await db
    .select({ id: maintenanceRequests.id })
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.userId, userId));
  const requests = userRequests.length;

  // Count bookings where user is owner or participant
  const userBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.userId, userId));
  const bookingsCount = userBookings.length;

  // Count conversations user participates in
  const userConversations = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));
  const conversationsCount = userConversations.length;

  // Count notifications for user
  const userNotifications = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(eq(notifications.userId, userId));
  const notificationsCount = userNotifications.length;

  const stats: DashboardStats = {
    requests,
    bookings: bookingsCount,
    messages: conversationsCount,
    notifications: notificationsCount,
  };

  return NextResponse.json(stats);
}
