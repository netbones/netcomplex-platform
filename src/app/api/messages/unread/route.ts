import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Drizzle imports - use individual exports from db.ts
import { db, messages, conversations, conversationParticipants, users } from '@/lib/db';
import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { withTenant } from '@/lib/tenant/with-tenant';

/**
 * GET /api/messages/unread - Get unread message counts for current user
 */
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all conversations where user is a participant (Drizzle)
    const userConversationsData = await db
      .select({
        participantId: conversationParticipants.id,
        lastReadAt: conversationParticipants.lastReadAt,
        conversationId: conversationParticipants.conversationId,
        conversationType: conversations.type,
        conversationUpdatedAt: conversations.updatedAt,
      })
      .from(conversationParticipants)
      .leftJoin(
        conversations,
        and(
          eq(conversationParticipants.conversationId, conversations.id),
          eq(conversations.tenantId, tenantId)
        )
      )
      .where(
        and(
          eq(conversationParticipants.userId, session.user.id),
          eq(conversationParticipants.tenantId, tenantId)
        )
      );

    const unreadCounts: Record<string, number> = {};
    let totalUnread = 0;

    for (const participant of userConversationsData) {
      const conversationId = participant.conversationId;
      const conversationType = participant.conversationType;

      // Get latest message in this conversation (Drizzle)
      const [latestMessage] = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(and(eq(messages.conversationId, conversationId), eq(messages.tenantId, tenantId)))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      if (!latestMessage) continue;

      // Count unread messages - messages from others created after lastReadAt
      const unreadResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.senderId, session.user.id),
            eq(messages.tenantId, tenantId),
            participant.lastReadAt ? gt(messages.createdAt, participant.lastReadAt) : undefined
          )
        );

      const unreadCount = Number(unreadResult[0]?.count || 0);

      if (unreadCount > 0) {
        // Get participants for this conversation (for DIRECT conversations)
        if (conversationType === 'DIRECT') {
          const allParticipants = await db
            .select({
              userId: conversationParticipants.userId,
            })
            .from(conversationParticipants)
            .where(
              and(
                eq(conversationParticipants.conversationId, conversationId),
                eq(conversationParticipants.tenantId, tenantId)
              )
            );

          const otherParticipant = allParticipants.find(p => p.userId !== session.user.id);
          if (otherParticipant) {
            unreadCounts[otherParticipant.userId] = unreadCount;
          }
        } else {
          // For group conversations, use conversation ID
          unreadCounts[conversationId] = unreadCount;
        }
        totalUnread += unreadCount;
      }
    }

    return NextResponse.json({
      unreadCounts,
      totalUnread,
    });
  } catch (error) {
    console.error('Unread messages fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/messages/unread - Mark conversation as read
 */
export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, messageId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Drizzle update for participant's last read info
    await db
      .update(conversationParticipants)
      .set({
        lastReadAt: new Date(),
        lastReadMessageId: messageId || null,
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, session.user.id),
          eq(conversationParticipants.tenantId, tenantId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
