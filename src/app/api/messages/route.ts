import {
  apiCreated,
  apiError,
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  auth,
  conversationParticipants,
  db,
  messages,
  notDeleted,
  now,
  premiumSeats,
  rateLimitByUser,
  revalidateConversations,
  users,
  getSessionAndRole,
} from '@api/server';

import { createClient } from '@supabase/supabase-js';
import { messageSchema } from '@entities/chat';

import { apiLogger } from '@shared/lib';

// Drizzle imports - use db.ts exports

import { eq, and, or, isNull, isNotNull, gt, lt, asc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { sanitizeHtml } from '@/shared/lib/sanitize/server';

import { hasPermission } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

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
/**
 * GET /api/messages - Get messages for a conversation
 * @query conversationId - Required conversation ID
 * Requires authentication
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return apiError('VALIDATION_ERROR', 'Conversation ID required', 400);
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Verify user has access to this conversation
  const [participant] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, authData.userId),
        eq(conversationParticipants.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!participant && !hasPermission(authData.role, 'admin')) {
    return apiForbidden('Access denied');
  }

  // Drizzle query with relation join for sender
  const result = await db
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
    .where(
      and(
        eq(messages.conversationId, conversationId),
        notDeleted(messages),
        or(isNull(messages.expiresAt), gt(messages.expiresAt, now()))
      )
    )
    .orderBy(asc(messages.createdAt));

  return apiSuccess(result);
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
    return apiUnauthorized();
  }

  // Rate limit: 30 messages per minute per user
  const rateLimit = await rateLimitByUser(authData.userId, { windowMs: 60_000, maxRequests: 30 });
  if (rateLimit) return rateLimit;

  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = messageSchema.safeParse(body);
    if (!validationResult.success) {
      return apiValidationError(validationResult.error.issues);
    }

    const { conversationId, content, type, mediaUrl, messageVersion, payload } =
      validationResult.data;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Verify user has access to this conversation
    const [participant] = await db
      .select({ id: conversationParticipants.id })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, authData.userId),
          eq(conversationParticipants.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!participant && !hasPermission(authData.role, 'admin')) {
      return apiForbidden('Access denied');
    }

    // Check for PremiumSeat to determine retention period (using Drizzle)
    const [premiumSeat] = await db
      .select({ messageRetentionDays: premiumSeats.messageRetentionDays })
      .from(premiumSeats)
      .where(eq(premiumSeats.userId, authData.userId))
      .limit(1);

    const retentionDays = premiumSeat?.messageRetentionDays ?? 30;
    const expiresAt = now();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    // Drizzle insert for new message (generate ID manually since Drizzle doesn't auto-generate)
    const [newMessage] = await db
      .insert(messages)
      .values({
        id: createId(),
        tenantId,
        conversationId,
        senderId: authData.userId,
        content: type === 'TEXT' ? sanitizeHtml(content) : content,
        type: type || 'TEXT',
        messageVersion: messageVersion || 1,
        payload,
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

    return apiCreated(message);
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/messages' }, 'Message creation error');
    return apiInternalError();
  }
}

/**
 * DELETE /api/messages - Prune expired messages (can be called by cron job)
 * Requires authentication
 */
export async function DELETE(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'admin')) {
    return apiForbidden();
  }

  try {
    // Drizzle delete for expired messages
    const expiredMessages = await db
      .update(messages)
      .set({ deletedAt: now() })
      .where(or(lt(messages.expiresAt, now()), isNotNull(messages.deletedAt)))
      .returning({ id: messages.id });

    revalidateConversations();

    return apiSuccess({ deleted: expiredMessages.length });
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/messages' }, 'Message pruning error');
    return apiInternalError();
  }
}
