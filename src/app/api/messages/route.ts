import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { messageSchema } from '@/lib/schemas';
import { revalidateConversations } from '@/lib/revalidation';

/** Supabase client for real-time message broadcasting */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Retrieves session and role from the request for API routes.
 * @param request - Incoming HTTP request
 * @returns Session data with user ID and role, or null if not authenticated
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return {
    session,
    userId: session.user.id,
    role: user?.role || 'RESIDENT',
  };
}

/**
 * GET /api/messages - Get messages for a conversation
 * @query conversationId - Required conversation ID
 * Requires authentication
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
  }

  // TODO: Add conversation access control - verify user has access to this conversation

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      isDeleted: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      sender: {
        select: { id: true, name: true, avatar: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(messages);
}

/**
 * POST /api/messages - Send a message and broadcast via Supabase Realtime
 * @body conversationId - Conversation ID
 * @body content - Message content
 * @body type - Message type (defaults to TEXT)
 * Requires authentication
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = messageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { conversationId, content, type, mediaUrl } = validationResult.data;

    // TODO: Add conversation access control - verify user has access to this conversation

    // Check for PremiumSeat to determine retention period
    const premiumSeat = await prisma.premiumSeat.findUnique({
      where: { userId: authData.userId },
      select: { messageRetentionDays: true },
    });

    const retentionDays = premiumSeat?.messageRetentionDays ?? 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: authData.userId,
        content,
        type,
        mediaUrl,
        expiresAt,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Revalidate conversation caches immediately when new message is sent
    revalidateConversations();

    // Broadcast via Supabase Realtime
    await supabase.channel(`chat:${conversationId}`).send({
      type: 'broadcast',
      event: 'new-message',
      payload: message,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/messages - Prune expired messages (can be called by cron job)
 * Requires authentication
 */
export async function DELETE(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (authData.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await prisma.message.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isDeleted: true }],
      },
    });

    revalidateConversations();

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Error pruning messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
