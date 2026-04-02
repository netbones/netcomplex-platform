import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { participantIds } = body;

  if (!participantIds || participantIds.length < 2) {
    return NextResponse.json({ error: 'Two participant IDs required' }, { status: 400 });
  }

  // Check if direct conversation already exists with exactly these two participants
  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      participants: {
        every: {
          userId: { in: participantIds },
        },
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  });

  // Filter to ensure exactly 2 participants (not more, not less)
  const validConversation = existing?.participants.length === 2 ? existing : null;

  if (validConversation) {
    return NextResponse.json({ conversation: validConversation });
  }

  // Create new direct conversation
  const conversation = await prisma.conversation.create({
    data: {
      name: null,
      type: 'DIRECT',
      participants: {
        create: participantIds.map((id: string) => ({ userId: id })),
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
