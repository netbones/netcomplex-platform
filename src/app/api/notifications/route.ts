import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

async function getSessionAndUserId(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}

export async function GET(request: Request) {
  const userId = await getSessionAndUserId(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unread = searchParams.get('unread');

  const where: Record<string, unknown> = { userId };
  if (unread === 'true') {
    where.read = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function POST(request: Request) {
  const userId = await getSessionAndUserId(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const notification = await prisma.notification.create({
    data: {
      userId: body.userId || userId,
      title: body.title,
      message: body.message,
      type: body.type || 'info',
      link: body.link,
    },
  });

  return NextResponse.json(notification, { status: 201 });
}

export async function PATCH(request: Request) {
  const userId = await getSessionAndUserId(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  } else if (body.id) {
    await prisma.notification.update({
      where: { id: body.id, userId },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
