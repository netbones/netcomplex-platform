import {
  auth,
  db,
  conversations,
  conversationParticipants,
  messages,
  users,
  apiCreated,
  apiError,
  apiSuccess,
  apiUnauthorized,
  now,
  withErrorHandler,
} from '@api/server';

// Drizzle imports - use db.ts exports

import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: Request) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return apiUnauthorized();
  }

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
        eq(conversationParticipants.userId, session.user.id),
        eq(conversations.tenantId, tenantId)
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

  return apiSuccess(conversationsWithDetails);
});

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  const body = await request.json();
  const { name, type, participantIds } = body;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Create conversation with Drizzle
  const conversationId = crypto.randomUUID();
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
  const allParticipantIds = [...new Set([session.user.id, ...(participantIds || [])])];
  await db.insert(conversationParticipants).values(
    allParticipantIds.map((userId: string) => ({
      id: crypto.randomUUID(),
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
