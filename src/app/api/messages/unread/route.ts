import { NextRequest } from 'next/server';
import {
  auth,
  db,
  messages,
  conversations,
  conversationParticipants,
  users,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
} from '@api/server';

// Drizzle imports - use individual exports from db.ts

import { eq, and, gt, desc, sql, ne } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';
import { logError } from '@shared/lib';

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
      return apiUnauthorized();
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
            ne(messages.senderId, session.user.id),
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

    return apiSuccess({
      unreadCounts,
      totalUnread,
    });
  } catch (error) {
    logError(
      { component: 'unread-messages-api', operation: 'GET' },
      'Unread messages fetch error',
      error
    );
    return apiInternalError();
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
      return apiUnauthorized();
    }

    const { conversationId, messageId } = await request.json();

    if (!conversationId) {
      return apiError('VALIDATION_ERROR', 'Conversation ID required', 400);
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

    return apiSuccess({ success: true });
  } catch (error) {
    logError({ component: 'unread-messages-api', operation: 'POST' }, 'Mark read error', error);
    return apiInternalError();
  }
}
