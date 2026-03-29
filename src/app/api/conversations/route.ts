import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { id: session.user.id },
      },
    },
    include: {
      participants: {
        select: { id: true, name: true, avatar: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(conversations);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const conversation = await prisma.conversation.create({
    data: {
      name: body.name,
      type: body.type || 'DIRECT',
      participants: {
        connect: body.participantIds.map((id: string) => ({ id })),
      },
    },
    include: {
      participants: true,
    },
  });

  return NextResponse.json(conversation, { status: 201 });
}
