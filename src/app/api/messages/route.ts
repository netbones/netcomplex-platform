import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: {
        select: { id: true, name: true, avatar: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const body = await request.json();

  const message = await prisma.message.create({
    data: {
      conversationId: body.conversationId,
      senderId: body.senderId || 'demo-user-id',
      content: body.content,
      type: body.type || 'TEXT',
    },
    include: {
      sender: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  // Broadcast via Supabase Realtime
  await supabase.channel(`messages:${body.conversationId}`).send({
    type: 'broadcast',
    event: 'new-message',
    payload: message,
  });

  return NextResponse.json(message, { status: 201 });
}
