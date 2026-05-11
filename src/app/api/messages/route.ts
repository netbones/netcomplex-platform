import { auth } from '@api/auth';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { messageSchema } from '@api/schemas';
import { revalidateConversations } from '@api/revalidation';
import { apiLogger } from '@shared/lib';

// Drizzle imports - use db.ts exports
import { db, messages, users, premiumSeats } from '@api/db';
import { eq, and, or, isNull, gt, lt, asc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';

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

  // Using Drizzle for user role lookup
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

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

  // Drizzle query with relation join for sender
  const result = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      type: messages.type,
      mediaUrl: messages.mediaUrl,
      createdAt: messages.createdAt,
      expiresAt: messages.expiresAt,
      isDeleted: messages.isDeleted,
      sender: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.isDeleted, false),
        or(isNull(messages.expiresAt), gt(messages.expiresAt, new Date()))
      )
    )
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(result);
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

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // TODO: Add conversation access control - verify user has access to this conversation

    // Check for PremiumSeat to determine retention period (using Drizzle)
    const [premiumSeat] = await db
      .select({ messageRetentionDays: premiumSeats.messageRetentionDays })
      .from(premiumSeats)
      .where(eq(premiumSeats.userId, authData.userId))
      .limit(1);

    const retentionDays = premiumSeat?.messageRetentionDays ?? 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    // Drizzle insert for new message (generate ID manually since Drizzle doesn't auto-generate)
    const [newMessage] = await db
      .insert(messages)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        conversationId,
        senderId: authData.userId,
        content,
        type: type || 'TEXT',
        mediaUrl,
        expiresAt,
      })
      .returning();

    // Fetch sender info for response
    const [senderInfo] = await db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users.id, authData.userId));

    const message = {
      ...newMessage,
      sender: senderInfo,
    };

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
    apiLogger.error({ err: error, path: '/api/messages' }, 'Message creation error');
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
    // Drizzle delete for expired messages
    const expiredMessages = await db
      .delete(messages)
      .where(or(lt(messages.expiresAt, new Date()), eq(messages.isDeleted, true)))
      .returning({ id: messages.id });

    revalidateConversations();

    return NextResponse.json({ deleted: expiredMessages.length });
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/messages' }, 'Message pruning error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
