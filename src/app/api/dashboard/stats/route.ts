import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

  const [requests, bookings, conversations, notifications] = await Promise.all([
    prisma.maintenanceRequest.count({ where: { userId } }),
    prisma.booking.count({
      where: {
        OR: [{ userId }, { residents: { some: { userId } } }],
      },
    }),
    prisma.conversation.count({
      where: { participants: { some: { userId } } },
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  const stats: DashboardStats = {
    requests,
    bookings,
    messages: conversations,
    notifications,
  };

  return NextResponse.json(stats);
}
