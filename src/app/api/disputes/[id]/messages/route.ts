import {
  apiCreated,
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  auth,
  db,
  disputeCases,
  disputeMessages,
  notDeleted,
  now,
  rateLimitByUser,
  users,
  withErrorHandler,
} from '@api/server';

import { createClient } from '@supabase/supabase-js';
import { disputeMessageCreateSchema } from '@entities/dispute';
import { apiLogger, hasPermission } from '@shared/lib';
import { sanitizeHtml } from '@/shared/lib/sanitize/server';
import { eq, and, asc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/** Supabase client for real-time mediation message broadcasting */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Retrieves session and role from the request for API routes.
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const userResult = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult[0]?.role || 'RESIDENT',
  };
}

/**
 * GET /api/disputes/[id]/messages — list mediation messages with visibility filtering.
 * Parties see only non-internal messages; moderators see all messages.
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }

    // Fetch dispute to verify access
    const [dispute] = await db
      .select()
      .from(disputeCases)
      .where(
        and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId), notDeleted(disputeCases))
      )
      .limit(1);

    if (!dispute) {
      return apiNotFound('Not found');
    }

    // Access control: party or moderator only
    const isParty =
      dispute.complainantId === authData.userId || dispute.respondentId === authData.userId;
    const isModerator =
      hasPermission(authData.role, 'admin') ||
      authData.role === 'BOARD' ||
      authData.role === 'COMMITTEE';

    if (!isParty && !isModerator) {
      return apiForbidden('Access denied');
    }

    // Build query with visibility filtering
    const conditions = [
      eq(disputeMessages.disputeId, id),
      eq(disputeMessages.tenantId, tenantId),
      notDeleted(disputeMessages),
    ];

    // Parties only see non-internal messages
    if (isParty && !isModerator) {
      conditions.push(eq(disputeMessages.isInternal, false));
    }
    // Moderators see all messages (no additional filter)

    const messages = await db
      .select()
      .from(disputeMessages)
      .where(and(...conditions))
      .orderBy(asc(disputeMessages.createdAt));

    return apiSuccess(messages);
  }
);

/**
 * POST /api/disputes/[id]/messages — create mediation message with
 * isInternal enforcement, sanitizeHtml, and Supabase Realtime broadcast.
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }

    // Rate limit: 30 messages per minute per user
    const rateLimit = await rateLimitByUser(authData.userId, {
      windowMs: 60_000,
      maxRequests: 30,
    });
    if (rateLimit) return rateLimit;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiValidationError([{ message: 'Invalid JSON body' }]);
    }

    const validationResult = disputeMessageCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiValidationError(validationResult.error.issues);
    }

    const { content, isInternal } = validationResult.data;

    // Fetch dispute to verify access and check moderator status
    const [dispute] = await db
      .select()
      .from(disputeCases)
      .where(
        and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId), notDeleted(disputeCases))
      )
      .limit(1);

    if (!dispute) {
      return apiNotFound('Not found');
    }

    // Access control
    const isParty =
      dispute.complainantId === authData.userId || dispute.respondentId === authData.userId;
    const isModerator =
      hasPermission(authData.role, 'admin') ||
      authData.role === 'BOARD' ||
      authData.role === 'COMMITTEE';

    if (!isParty && !isModerator) {
      return apiForbidden('Access denied');
    }

    // Enforce isInternal: only moderators can post internal notes
    if (isInternal && !isModerator) {
      return apiForbidden('Only moderators can post internal notes');
    }

    // Sanitize content before insert
    const sanitizedContent = sanitizeHtml(content);

    const ts = now();

    try {
      const [newMessage] = await db
        .insert(disputeMessages)
        .values({
          id: createId(),
          tenantId,
          disputeId: id,
          senderId: authData.userId,
          content: sanitizedContent,
          isInternal: isInternal ?? false,
          createdAt: ts,
        })
        .returning();

      // Broadcast via Supabase Realtime
      await supabase.channel(`dispute:${id}`).send({
        type: 'broadcast',
        event: 'new-mediation-message',
        payload: newMessage,
      });

      return apiCreated(newMessage);
    } catch (error) {
      apiLogger.error({ err: error, disputeId: id }, 'Mediation message creation error');
      return apiInternalError();
    }
  }
);
