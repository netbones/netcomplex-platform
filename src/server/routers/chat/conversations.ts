import { toEnvelope } from '@api/server';
import { conversationDto } from '@server/dto';
import {
  z,
  protectedProcedure,
  db,
  conversations,
  conversationParticipants,
  messages,
  users,
  TRPCError,
  eq,
  and,
  desc,
  inArray,
  sql,
} from './shared';

export const conversationProcedures = {
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
          and(eq(conversationParticipants.userId, ctx.userId), eq(conversations.tenantId, tenantId))
        )
        .orderBy(desc(conversations.updatedAt));

      const conversationIds = userConversations.map(c => c.id);

      if (conversationIds.length === 0) {
        return toEnvelope([]);
      }

      const allParticipants = await db
        .select({
          id: conversationParticipants.id,
          conversationId: conversationParticipants.conversationId,
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
        .where(inArray(conversationParticipants.conversationId, conversationIds));

      const participantsByConv = new Map<string, typeof allParticipants>();
      for (const p of allParticipants) {
        const list = participantsByConv.get(p.conversationId) || [];
        list.push(p);
        participantsByConv.set(p.conversationId, list);
      }

      const latestMessages = await db
        .selectDistinctOn([messages.conversationId], {
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
        .where(inArray(messages.conversationId, conversationIds))
        .orderBy(messages.conversationId, desc(messages.createdAt));

      const latestByConv = new Map<string, (typeof latestMessages)[0]>();
      for (const m of latestMessages) {
        if (!latestByConv.has(m.conversationId)) {
          latestByConv.set(m.conversationId, m);
        }
      }

      return toEnvelope(
        userConversations.map(conv => {
          const latest = latestByConv.get(conv.id);
          return conversationDto.parse({
            ...conv,
            participants: participantsByConv.get(conv.id) || [],
            messages: latest ? [latest] : [],
          });
        })
      );
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

      const allParticipantIds = [...new Set([ctx.userId, ...input.participantIds])];

      if (input.participantIds.length > 0) {
        const validUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(inArray(users.id, input.participantIds), eq(users.tenantId, tenantId)));

        const validIds = new Set(validUsers.map(u => u.id));
        const invalidIds = input.participantIds.filter(id => !validIds.has(id));
        if (invalidIds.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid participant(s): ${invalidIds.join(', ')}`,
          });
        }
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

      return toEnvelope(
        conversationDto.parse({
          ...createdConversation!,
          participants,
          messages: [],
        })
      );
    }),

  findOrCreateConversation: protectedProcedure
    .input(
      z.object({
        participantIds: z.array(z.string().uuid()).length(2),
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
        return toEnvelope({ conversation: validConversation });
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

      return toEnvelope({ conversation: result.rows?.[0] ?? {} });
    }),
};
