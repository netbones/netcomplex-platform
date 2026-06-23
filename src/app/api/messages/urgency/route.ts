import {
  apiSuccess,
  apiInternalError,
  apiUnauthorized,
  db,
  conversations,
  conversationParticipants,
  messages,
  announcements,
  notifications,
  auth,
  now,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';

import { count, eq, and, ne, gt, sql, or } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';
import { headers } from 'next/headers';

export const maxDuration = 8;

const log = createComponentLogger('messages-urgency-api');

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { tenantId } = await withTenant();
    const userId = session.user.id;

    const [
      unreadDirectResult,
      unreadGroupResult,
      unreadAnnouncementsResult,
      pendingNotificationsResult,
    ] = await Promise.all([
      // Unread direct messages: messages in DIRECT conversations where user is participant,
      // sender is not the user, and message was created after lastReadAt
      db
        .select({ count: count() })
        .from(messages)
        .innerJoin(
          conversationParticipants,
          and(
            eq(messages.conversationId, conversationParticipants.conversationId),
            eq(conversationParticipants.userId, userId),
            eq(conversationParticipants.tenantId, tenantId)
          )
        )
        .innerJoin(
          conversations,
          and(
            eq(messages.conversationId, conversations.id),
            eq(conversations.tenantId, tenantId),
            eq(conversations.type, 'DIRECT')
          )
        )
        .where(
          and(
            eq(messages.tenantId, tenantId),
            ne(messages.senderId, userId),
            sql`${conversationParticipants.lastReadAt} IS NULL OR ${messages.createdAt} > ${conversationParticipants.lastReadAt}`
          )
        ),

      // Unread group messages: same pattern but for GROUP conversations
      db
        .select({ count: count() })
        .from(messages)
        .innerJoin(
          conversationParticipants,
          and(
            eq(messages.conversationId, conversationParticipants.conversationId),
            eq(conversationParticipants.userId, userId),
            eq(conversationParticipants.tenantId, tenantId)
          )
        )
        .innerJoin(
          conversations,
          and(
            eq(messages.conversationId, conversations.id),
            eq(conversations.tenantId, tenantId),
            eq(conversations.type, 'GROUP')
          )
        )
        .where(
          and(
            eq(messages.tenantId, tenantId),
            ne(messages.senderId, userId),
            sql`${conversationParticipants.lastReadAt} IS NULL OR ${messages.createdAt} > ${conversationParticipants.lastReadAt}`
          )
        ),

      // Active (unread) announcements: published and not expired
      // Note: No published field on announcements table — using expiresAt as proxy
      db
        .select({ count: count() })
        .from(announcements)
        .where(
          and(
            eq(announcements.tenantId, tenantId),
            or(sql`${announcements.expiresAt} IS NULL`, gt(announcements.expiresAt, now()))
          )
        ),

      // Pending (unread) notifications for current user
      db
        .select({ count: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false))),
    ]);

    const extractCount = (result: { count: number }[]) => result[0]?.count ?? 0;

    const unreadDirect = extractCount(unreadDirectResult);
    const unreadGroup = extractCount(unreadGroupResult);
    const unreadAnnouncements = extractCount(unreadAnnouncementsResult);
    const pendingNotifications = extractCount(pendingNotificationsResult);

    return apiSuccess({
      commandBar: {
        unreadDirect,
        unreadGroup,
        unreadAnnouncements,
      },
      domainBadges: {
        conversations: unreadDirect + unreadGroup,
        announcements: unreadAnnouncements,
        notifications: pendingNotifications,
      },
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get messages urgency counts', error);
    return apiInternalError(String(error));
  }
}
