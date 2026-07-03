import { notDeleted, rateLimitMiddleware, toEnvelope } from '@api/server';
import { messageDto, unreadCountsDto } from '@api/server';
import {
  z,
  tenantProcedure,
  privilegedProcedure,
  db,
  conversations,
  conversationParticipants,
  messages,
  users,
  announcements,
  notifications,
  revalidateConversations,
  TRPCError,
  hasPermission,
  eq,
  and,
  or,
  desc,
  ne,
  gt,
  count,
  isNull,
  lt,
  sql,
  inArray,
  SQL,
  checkParticipant,
} from './shared';
import { createId } from '@shared/lib/id';

export const messagingProcedures = {
  /**
   * Get messages for a conversation. User must be a participant or admin.
   * @tenant
   */
  getMessages: tenantProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .output(
      z.array(
        z.object({
          id: z.string(),
          conversationId: z.string(),
          senderId: z.string(),
          content: z.string(),
          type: z.string(),
          messageVersion: z.number(),
          payload: z.unknown().nullable(),
          mediaUrl: z.string().nullable(),
          createdAt: z.date(),
          expiresAt: z.date().nullable(),
          deletedAt: z.date().nullable(),
          sender: z
            .object({
              id: z.string(),
              name: z.string().nullable(),
              avatar: z.string().nullable(),
            })
            .nullable(),
        })
      )
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const participant = await checkParticipant(input.conversationId, ctx.userId, tenantId);
      if (!participant && !hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const conditionsArr: SQL<unknown>[] = [
        eq(messages.conversationId, input.conversationId),
        notDeleted(messages),
        or(isNull(messages.expiresAt), gt(messages.expiresAt, new Date())),
      ].filter(Boolean) as SQL<unknown>[];

      if (input.cursor) {
        conditionsArr.push(lt(messages.createdAt, input.cursor));
      }

      const rows = await db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          content: messages.content,
          type: messages.type,
          messageVersion: messages.messageVersion,
          payload: messages.payload,
          mediaUrl: messages.mediaUrl,
          createdAt: messages.createdAt,
          expiresAt: messages.expiresAt,
          deletedAt: messages.deletedAt,
          sender: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(and(...conditionsArr))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const messages_ = rows.slice(0, input.limit);

      return toEnvelope({
        messages: messages_.map(r => messageDto.parse(r)),
        hasMore,
      });
    }),

  /**
   * Send a message to a conversation. Rate-limited to 30/minute.
   * @tenant
   */
  sendMessage: tenantProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 30 }))
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1).max(2000),
        type: z.string().default('TEXT'),
        mediaUrl: z.string().optional(),
        payload: z.unknown().optional(),
      })
    )
    .output(
      z.object({
        id: z.string(),
        conversationId: z.string(),
        senderId: z.string(),
        content: z.string(),
        type: z.string(),
        messageVersion: z.number(),
        payload: z.unknown().nullable(),
        mediaUrl: z.string().nullable(),
        createdAt: z.date(),
        expiresAt: z.date().nullable(),
        deletedAt: z.date().nullable(),
        sender: z
          .object({
            id: z.string(),
            name: z.string().nullable(),
            avatar: z.string().nullable(),
          })
          .nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const participant = await checkParticipant(input.conversationId, ctx.userId, tenantId);
      if (!participant && !hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const ts = new Date();
      const expiresAt = new Date(ts);
      expiresAt.setDate(expiresAt.getDate() + 30);

      const [newMessage] = await db
        .insert(messages)
        .values({
          id: createId(),
          tenantId,
          conversationId: input.conversationId,
          senderId: ctx.userId,
          content: input.content.trim(),
          type: input.type as 'TEXT' | 'IMAGE' | 'SYSTEM',
          messageVersion: 1,
          payload: input.payload ?? null,
          mediaUrl: input.mediaUrl ?? null,
          createdAt: ts,
          expiresAt,
        })
        .returning();

      const [senderInfo] = await db
        .select({
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, ctx.userId));

      revalidateConversations();

      return toEnvelope(
        messageDto.parse({
          ...newMessage,
          sender: senderInfo,
        })
      );
    }),

  /**
   * Soft-delete a message. Requires privileged access.
   * @privileged
   */
  deleteMessage: privilegedProcedure
    .input(z.object({ messageId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.id, input.messageId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' });
      }

      await db
        .update(messages)
        .set({ deletedAt: new Date() })
        .where(eq(messages.id, input.messageId));

      revalidateConversations();

      return toEnvelope({ success: true });
    }),

  /**
   * Get urgency counts for the current tenant (unread messages, announcements, notifications).
   * @tenant
   */
  getMessageUrgency: tenantProcedure
    .input(z.void())
    .output(
      z.object({
        commandBar: z.object({
          unreadDirect: z.number(),
          unreadGroup: z.number(),
          unreadAnnouncements: z.number(),
        }),
        domainBadges: z.object({
          conversations: z.number(),
          announcements: z.number(),
          notifications: z.number(),
        }),
      })
    )
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;

      const userId = ctx.userId;

      const [
        unreadDirectResult,
        unreadGroupResult,
        unreadAnnouncementsResult,
        pendingNotificationsResult,
      ] = await Promise.all([
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

        db
          .select({ count: count() })
          .from(announcements)
          .where(
            and(
              eq(announcements.tenantId, tenantId),
              or(sql`${announcements.expiresAt} IS NULL`, gt(announcements.expiresAt, new Date()))
            )
          ),

        db
          .select({ count: count() })
          .from(notifications)
          .where(and(eq(notifications.userId, userId), eq(notifications.read, false))),
      ]);

      const extractCount = (result: { count: number | string }[]) => Number(result[0]?.count ?? 0);

      const unreadDirect = extractCount(unreadDirectResult);
      const unreadGroup = extractCount(unreadGroupResult);
      const unreadAnnouncements = extractCount(unreadAnnouncementsResult);
      const pendingNotifications = extractCount(pendingNotificationsResult);

      return toEnvelope({
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
    }),

  /**
   * Get unread message counts for the current user in the current tenant.
   * @tenant
   */
  getUnreadCounts: tenantProcedure
    .input(z.void())
    .output(
      z.object({
        unreadCounts: z.record(z.string(), z.number()),
        totalUnread: z.number(),
      })
    )
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;

      const userId = ctx.userId;

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
            eq(conversationParticipants.userId, userId),
            eq(conversationParticipants.tenantId, tenantId)
          )
        );

      const conversationIds = userConversationsData.map(p => p.conversationId);
      const lastReadMap = new Map(userConversationsData.map(p => [p.conversationId, p.lastReadAt]));
      const typeMap = new Map(
        userConversationsData.map(p => [p.conversationId, p.conversationType])
      );

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
                WHERE m."conversationId" IN (${sql.join(
                  conversationIds.map(id => sql`${id}`),
                  sql`, `
                )})
                  AND m."tenantId" = ${tenantId}
                ORDER BY m."conversationId", m."createdAt" DESC
              `
            )
          : { rows: [] };

      const latestMessageMap = new Map<string, NonNullable<(typeof latestMessageRows.rows)[0]>>();
      for (const row of latestMessageRows.rows) {
        latestMessageMap.set(row.conversationId, row);
      }

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
                  ne(messages.senderId, userId),
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
          const otherParticipant = participants.find(p => p.userId !== userId);
          if (otherParticipant) unreadCounts[otherParticipant.userId] = unreadCount;
        } else {
          unreadCounts[conversationId] = unreadCount;
        }
        totalUnread += unreadCount;
      }

      return toEnvelope(
        unreadCountsDto.parse({
          unreadCounts,
          totalUnread,
        })
      );
    }),

  /**
   * Mark a conversation as read up to a specific message.
   * @tenant
   */
  markAsRead: tenantProcedure
    .input(
      z.object({
        conversationId: z.string(),
        lastReadMessageId: z.string().optional(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      await db
        .update(conversationParticipants)
        .set({
          lastReadAt: new Date(),
          lastReadMessageId: input.lastReadMessageId || null,
        })
        .where(
          and(
            eq(conversationParticipants.conversationId, input.conversationId),
            eq(conversationParticipants.userId, ctx.userId),
            eq(conversationParticipants.tenantId, tenantId)
          )
        );

      return toEnvelope({ success: true });
    }),
};
