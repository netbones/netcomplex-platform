import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { id: userId || '' },
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
