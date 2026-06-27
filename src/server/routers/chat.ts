import { z } from 'zod';
import {
  router,
  protectedProcedure,
  adminProcedure,
  db,
  conversations,
  conversationParticipants,
  messages,
  users,
  announcements,
  notifications,
  revalidateConversations,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and, or, desc, ne, gt, count, isNull, lt, sql, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

async function checkParticipant(conversationId: string, userId: string, tenantId: string) {
  const [participant] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
        eq(conversationParticipants.tenantId, tenantId)
      )
    )
    .limit(1);
  return participant;
}

export const chatRouter = router({
  listConversations: protectedProcedure
    .input(z.void())
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string().nullable(),
          type: z.string(),
          capabilities: z.unknown().nullable(),
          createdAt: z.date(),
          updatedAt: z.date(),
          participants: z.array(
            z.object({
              id: z.string(),
              userId: z.string(),
              joinedAt: z.date(),
              lastReadAt: z.date().nullable(),
              lastReadMessageId: z.string().nullable(),
              user: z
                .object({
                  id: z.string(),
                  name: z.string().nullable(),
                  avatar: z.string().nullable(),
                })
                .nullable(),
            })
          ),
          messages: z.array(
            z.object({
              id: z.string(),
              conversationId: z.string(),
              senderId: z.string(),
              content: z.string(),
              type: z.string(),
              messageVersion: z.number(),
              payload: z.unknown().nullable(),
              createdAt: z.date(),
              expiresAt: z.date().nullable(),
              deletedAt: z.date().nullable(),
              mediaUrl: z.string().nullable(),
            })
          ),
        })
      )
    )
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const userConversations = await db
        .select({
          id: conversations.id,
          name: conversations.name,
          type: conversations.type,
          capabilities: conversations.capabilities,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
        })
        .from(conversations)
        .innerJoin(
          conversationParticipants,
          eq(conversations.id, conversationParticipants.conversationId)
        )
        .where(
          and(
            eq(conversationParticipants.userId, ctx.userId!),
            eq(conversations.tenantId, tenantId)
          )
        )
        .orderBy(desc(conversations.updatedAt));

      const conversationsWithDetails = await Promise.all(
        userConversations.map(async conv => {
          const participants = await db
            .select({
              id: conversationParticipants.id,
              userId: conversationParticipants.userId,
              joinedAt: conversationParticipants.joinedAt,
              lastReadAt: conversationParticipants.lastReadAt,
              lastReadMessageId: conversationParticipants.lastReadMessageId,
              user: {
                id: users.id,
                name: users.name,
                avatar: users.avatar,
              },
            })
            .from(conversationParticipants)
            .leftJoin(users, eq(conversationParticipants.userId, users.id))
            .where(eq(conversationParticipants.conversationId, conv.id));

          const [latestMessage] = await db
            .select({
              id: messages.id,
              conversationId: messages.conversationId,
              senderId: messages.senderId,
              content: messages.content,
              type: messages.type,
              messageVersion: messages.messageVersion,
              payload: messages.payload,
              createdAt: messages.createdAt,
              expiresAt: messages.expiresAt,
              deletedAt: messages.deletedAt,
              mediaUrl: messages.mediaUrl,
            })
            .from(messages)
            .where(eq(messages.conversationId, conv.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);

          return {
            ...conv,
            participants,
            messages: latestMessage ? [latestMessage] : [],
          };
        })
      );

      return conversationsWithDetails;
    }),

  createConversation: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        type: z.string().default('DIRECT'),
        participantIds: z.array(z.string()),
      })
    )
    .output(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        type: z.string(),
        capabilities: z.unknown().nullable(),
        createdAt: z.date(),
        updatedAt: z.date(),
        participants: z.array(
          z.object({
            id: z.string(),
            userId: z.string(),
            joinedAt: z.date(),
            lastReadAt: z.date().nullable(),
            lastReadMessageId: z.string().nullable(),
            user: z
              .object({
                id: z.string(),
                name: z.string().nullable(),
                avatar: z.string().nullable(),
              })
              .nullable(),
          })
        ),
        messages: z.array(z.never()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conversationId = crypto.randomUUID();
      const ts = new Date();

      await db.insert(conversations).values({
        id: conversationId,
        tenantId,
        name: input.name || null,
        type: input.type as 'DIRECT' | 'GROUP',
        createdAt: ts,
        updatedAt: ts,
      });

      const allParticipantIds = [...new Set([ctx.userId!, ...input.participantIds])];
      await db.insert(conversationParticipants).values(
        allParticipantIds.map(userId => ({
          id: crypto.randomUUID(),
          tenantId,
          conversationId,
          userId,
          joinedAt: ts,
        }))
      );

      const [createdConversation] = await db
        .select({
          id: conversations.id,
          name: conversations.name,
          type: conversations.type,
          capabilities: conversations.capabilities,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
        })
        .from(conversations)
        .where(eq(conversations.id, conversationId));

      const participants = await db
        .select({
          id: conversationParticipants.id,
          userId: conversationParticipants.userId,
          joinedAt: conversationParticipants.joinedAt,
          lastReadAt: conversationParticipants.lastReadAt,
          lastReadMessageId: conversationParticipants.lastReadMessageId,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(conversationParticipants)
        .leftJoin(users, eq(conversationParticipants.userId, users.id))
        .where(eq(conversationParticipants.conversationId, conversationId));

      return {
        ...createdConversation!,
        participants,
        messages: [],
      };
    }),

  findOrCreateConversation: protectedProcedure
    .input(
      z.object({
        participantIds: z.array(z.string()).length(2),
      })
    )
    .output(z.object({ conversation: z.record(z.unknown()) }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const existing = (await db.execute(sql`
        SELECT c.*,
          json_agg(
            json_build_object(
              'id', cp.id,
              'userId', cp."userId",
              'user', json_build_object('id', u.id, 'name', u.name, 'avatar', u.image)
            )
          ) FILTER (WHERE cp.id IS NOT NULL) as participants
        FROM "Conversation" c
        JOIN "ConversationParticipant" cp ON cp."conversationId" = c.id
        JOIN "user" u ON u.id = cp."userId"
        WHERE c.type = 'DIRECT'
        AND c."tenantId" = ${tenantId}
        AND cp."userId" IN ${sql`${input.participantIds}`}
        GROUP BY c.id
        HAVING COUNT(DISTINCT cp."userId") = 2
      `)) as { rows: Record<string, unknown>[] };

      const validConversation = existing.rows?.length ? existing.rows[0] : null;
      if (validConversation) {
        return { conversation: validConversation };
      }

      const conversationId = crypto.randomUUID();
      await db.execute(sql`
        INSERT INTO "Conversation" (id, name, type, "tenantId")
        VALUES (${conversationId}, NULL, 'DIRECT', ${tenantId})
      `);

      for (const userId of input.participantIds) {
        await db.execute(sql`
          INSERT INTO "ConversationParticipant" (id, "conversationId", "userId", "tenantId")
          VALUES (${crypto.randomUUID()}, ${conversationId}, ${userId}, ${tenantId})
        `);
      }

      const result = (await db.execute(sql`
        SELECT c.*,
          json_agg(
            json_build_object(
              'id', cp.id,
              'userId', cp."userId",
              'user', json_build_object('id', u.id, 'name', u.name, 'avatar', u.image)
            )
          ) FILTER (WHERE cp.id IS NOT NULL) as participants
        FROM "Conversation" c
        JOIN "ConversationParticipant" cp ON cp."conversationId" = c.id
        JOIN "user" u ON u.id = cp."userId"
        WHERE c.id = ${conversationId}
        AND c."tenantId" = ${tenantId}
        GROUP BY c.id
      `)) as { rows: Record<string, unknown>[] };

      return { conversation: result.rows?.[0] ?? {} };
    }),

  getMessages: protectedProcedure
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
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const participant = await checkParticipant(input.conversationId, ctx.userId!, tenantId);
      if (!participant && !hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const conditionsArr: SQL<unknown>[] = [
        eq(messages.conversationId, input.conversationId),
        isNull(messages.deletedAt),
        or(isNull(messages.expiresAt), gt(messages.expiresAt, new Date()))!,
      ];

      if (input.cursor) {
        conditionsArr.push(lt(messages.createdAt, input.cursor));
      }

      return db
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
        .limit(input.limit);
    }),

  sendMessage: protectedProcedure
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
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const participant = await checkParticipant(input.conversationId, ctx.userId!, tenantId);
      if (!participant && !hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const ts = new Date();
      const expiresAt = new Date(ts);
      expiresAt.setDate(expiresAt.getDate() + 30);

      const [newMessage] = await db
        .insert(messages)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          conversationId: input.conversationId,
          senderId: ctx.userId!,
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
        .where(eq(users.id, ctx.userId!));

      revalidateConversations();

      return {
        ...newMessage,
        sender: senderInfo,
      };
    }),

  deleteMessage: adminProcedure
    .input(z.object({ messageId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(messages)
        .set({ deletedAt: new Date() })
        .where(eq(messages.id, input.messageId));

      revalidateConversations();

      return { success: true };
    }),

  getMessageUrgency: protectedProcedure
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
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const userId = ctx.userId!;

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

      const extractCount = (result: { count: number }[]) => result[0]?.count ?? 0;

      const unreadDirect = extractCount(unreadDirectResult);
      const unreadGroup = extractCount(unreadGroupResult);
      const unreadAnnouncements = extractCount(unreadAnnouncementsResult);
      const pendingNotifications = extractCount(pendingNotificationsResult);

      return {
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
      };
    }),

  getUnreadCounts: protectedProcedure
    .input(z.void())
    .output(
      z.object({
        unreadCounts: z.record(z.string(), z.number()),
        totalUnread: z.number(),
      })
    )
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const userId = ctx.userId!;

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

      return {
        unreadCounts,
        totalUnread,
      };
    }),

  markAsRead: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        lastReadMessageId: z.string().optional(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      await db
        .update(conversationParticipants)
        .set({
          lastReadAt: new Date(),
          lastReadMessageId: input.lastReadMessageId || null,
        })
        .where(
          and(
            eq(conversationParticipants.conversationId, input.conversationId),
            eq(conversationParticipants.userId, ctx.userId!),
            eq(conversationParticipants.tenantId, tenantId)
          )
        );

      return { success: true };
    }),
});
