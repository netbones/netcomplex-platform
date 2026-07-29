import {
  apiCreated,
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
  db,
  disputeCases,
  disputeMessages,
  notDeleted,
  now,
  rateLimitByUser,
  withErrorHandler,
} from '@api/server';

import { broadcastDisputeMessage } from '@shared/lib';
import { disputeMessageCreateSchema } from '@entities/dispute';
import { apiLogger, hasPermission } from '@shared/lib';
import { sanitizeHtml } from '@/shared/lib/sanitize/server';
import { eq, and, asc } from 'drizzle-orm';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';
import { requireAuth } from '@/shared/api/auth-utils';

export const maxDuration = 8;

/**
 * GET /api/disputes/[id]/messages — list mediation messages with visibility filtering.
 * Parties see only non-internal messages; moderators see all messages.
 * @deprecated Use trpc.disputes.listDisputeMessages instead.
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;
    const featureCheck = await assertModuleEnabled('disputes');
    if (featureCheck) return featureCheck;

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
      dispute.complainantId === auth.data.userId || dispute.respondentId === auth.data.userId;
    const isModerator =
      hasPermission(auth.data.role, 'admin') ||
      auth.data.role === 'BOARD' ||
      auth.data.role === 'COMMITTEE';

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
 * @deprecated Use trpc.disputes.addDisputeMessage instead.
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;
    const featureCheck = await assertModuleEnabled('disputes');
    if (featureCheck) return featureCheck;

    // Rate limit: 30 messages per minute per user
    const rateLimit = await rateLimitByUser(auth.data.userId, {
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
      dispute.complainantId === auth.data.userId || dispute.respondentId === auth.data.userId;
    const isModerator =
      hasPermission(auth.data.role, 'admin') ||
      auth.data.role === 'BOARD' ||
      auth.data.role === 'COMMITTEE';

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
          senderId: auth.data.userId,
          content: sanitizedContent,
          isInternal: isInternal ?? false,
          createdAt: ts,
        })
        .returning();

      broadcastDisputeMessage(id, newMessage as unknown as Record<string, unknown>);

      return apiCreated(newMessage);
    } catch (error) {
      apiLogger.error({ err: error, disputeId: id }, 'Mediation message creation error');
      return apiInternalError();
    }
  }
);
