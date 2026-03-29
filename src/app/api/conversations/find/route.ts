import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { participantIds } = body;

  if (!participantIds || participantIds.length < 2) {
    return NextResponse.json({ error: 'Two participant IDs required' }, { status: 400 });
  }

  // Check if direct conversation already exists
  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      participants: {
        every: {
          id: { in: participantIds },
        },
      },
    },
    include: {
      participants: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  if (existing) {
    return NextResponse.json({ conversation: existing });
  }

  // Create new direct conversation
  const conversation = await prisma.conversation.create({
    data: {
      name: null,
      type: 'DIRECT',
      participants: {
        connect: participantIds.map((id: string) => ({ id })),
      },
    },
    include: {
      participants: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
