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
  now,
} from '@api/server';

// Drizzle imports - use individual exports from db.ts

import { eq, and, sql, ne, inArray } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

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

    const conversationIds = userConversationsData.map(p => p.conversationId);
    const lastReadMap = new Map(userConversationsData.map(p => [p.conversationId, p.lastReadAt]));
    const typeMap = new Map(userConversationsData.map(p => [p.conversationId, p.conversationType]));

    // Batch 1: latest message per conversation via DISTINCT ON
    const latestMessageRows =
      conversationIds.length > 0
        ? await db.execute<{
            id: string;
            senderId: string;
            createdAt: Date;
            conversationId: string;
          }>(
            sql`
            SELECT DISTINCT ON (m."conversationId") m."id", m."senderId", m."createdAt", m."conversationId"
            FROM "Message" m
            WHERE m."conversationId" IN ${sql.join(
              conversationIds.map(id => sql`${id}`),
              sql`, `
            )}
              AND m."tenantId" = ${tenantId}
            ORDER BY m."conversationId", m."createdAt" DESC
          `
          )
        : { rows: [] };
    const latestMessageMap = new Map<string, NonNullable<(typeof latestMessageRows.rows)[0]>>();
    for (const row of latestMessageRows.rows) {
      latestMessageMap.set(row.conversationId, row);
    }

    // Batch 2: all unread messages from others (filter by lastReadAt in memory)
    const unreadMessageRows =
      conversationIds.length > 0
        ? await db
            .select({
              conversationId: messages.conversationId,
              createdAt: messages.createdAt,
            })
            .from(messages)
            .where(
              and(
                inArray(messages.conversationId, conversationIds),
                ne(messages.senderId, session.user.id),
                eq(messages.tenantId, tenantId)
              )
            )
        : [];
    const unreadCountMap = new Map<string, number>();
    for (const msg of unreadMessageRows) {
      const lastReadAt = lastReadMap.get(msg.conversationId);
      if (lastReadAt && msg.createdAt <= lastReadAt) continue;
      unreadCountMap.set(msg.conversationId, (unreadCountMap.get(msg.conversationId) || 0) + 1);
    }

    // Batch 3: participants for DIRECT conversations
    const directConvIds = userConversationsData
      .filter(p => p.conversationType === 'DIRECT')
      .map(p => p.conversationId);
    const directParticipantRows =
      directConvIds.length > 0
        ? await db
            .select({
              conversationId: conversationParticipants.conversationId,
              userId: conversationParticipants.userId,
            })
            .from(conversationParticipants)
            .where(
              and(
                inArray(conversationParticipants.conversationId, directConvIds),
                eq(conversationParticipants.tenantId, tenantId)
              )
            )
        : [];
    const participantMap = new Map<string, { userId: string }[]>();
    for (const p of directParticipantRows) {
      const arr = participantMap.get(p.conversationId);
      if (arr) arr.push(p);
      else participantMap.set(p.conversationId, [p]);
    }

    const unreadCounts: Record<string, number> = {};
    let totalUnread = 0;
    for (const participant of userConversationsData) {
      const conversationId = participant.conversationId;
      if (!latestMessageMap.has(conversationId)) continue;
      const unreadCount = unreadCountMap.get(conversationId) || 0;
      if (unreadCount === 0) continue;
      const conversationType = typeMap.get(conversationId);
      if (conversationType === 'DIRECT') {
        const participants = participantMap.get(conversationId) || [];
        const otherParticipant = participants.find(p => p.userId !== session.user.id);
        if (otherParticipant) unreadCounts[otherParticipant.userId] = unreadCount;
      } else {
        unreadCounts[conversationId] = unreadCount;
      }
      totalUnread += unreadCount;
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
        lastReadAt: now(),
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
