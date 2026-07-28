import {
  db,
  conversations,
  conversationParticipants,
  messages,
  users,
  apiSuccess,
  now,
  notDeleted,
  withErrorHandler,
} from '@api/server';

import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/** @deprecated Use `trpc.conversations.listConversations` instead */
export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { tenantId } = await withTenant();

  // Get conversations where user is a participant (Drizzle)
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
        eq(conversationParticipants.userId, auth.data.userId),
        eq(conversations.tenantId, tenantId),
        notDeleted(conversations)
      )
    )
    .orderBy(desc(conversations.updatedAt));

  // For each conversation, get participants and latest message
  const conversationsWithDetails = await Promise.all(
    userConversations.map(async conv => {
      // Get participants
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

      // Get latest message
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
        .where(and(eq(messages.conversationId, conv.id), notDeleted(messages)))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      return {
        ...conv,
        participants,
        messages: latestMessage ? [latestMessage] : [],
      };
    })
  );

  return apiSuccess(conversationsWithDetails);
});

/** @deprecated Use `trpc.conversations.createConversation` instead */
export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const body = await request.json();
  const { name, type, participantIds } = body;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Create conversation with Drizzle
  const conversationId = createId();
  const ts = now();

  // Insert conversation
  await db.insert(conversations).values({
    id: conversationId,
    tenantId,
    name: name || null,
    type: type || 'DIRECT',
    createdAt: ts,
    updatedAt: ts,
  });

  // Add participants including the current user (deduplicate)
  const allParticipantIds = [...new Set([auth.data.userId, ...(participantIds || [])])];
  await db.insert(conversationParticipants).values(
    allParticipantIds.map((userId: string) => ({
      id: createId(),
      tenantId,
      conversationId,
      userId,
      joinedAt: ts,
    }))
  );

  // Fetch the created conversation with participants
  const createdConversation = await db
    .select({
      id: conversations.id,
      name: conversations.name,
      type: conversations.type,
      capabilities: conversations.capabilities,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .then(rows => rows[0]);

  // Get participants with user details
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

  return apiSuccess(
    {
      ...createdConversation,
      participants,
      messages: [],
    },
    { status: 201 }
  );
});
