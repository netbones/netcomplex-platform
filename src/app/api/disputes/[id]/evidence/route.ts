import {
  apiCreated,
  apiError,
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiUnauthorized,
  apiValidationError,
  auth,
  db,
  disputeCases,
  disputeEvents,
  disputeEvidences,
  notDeleted,
  now,
  rateLimitByUser,
  uploadImage,
  users,
  withErrorHandler,
  getSessionAndRole,
} from '@api/server';

import { apiLogger, hasPermission } from '@shared/lib';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/**
 * Retrieves session and role from the request for API routes.
 */
/**
 * POST /api/disputes/[id]/evidence — upload evidence file.
 * Uses uploadImage() for S3 storage, inserts DisputeEvidence row,
 * and logs EVIDENCE_ADDED event.
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }

    // Rate limit: 10 uploads per minute per user
    const rateLimit = await rateLimitByUser(authData.userId, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (rateLimit) return rateLimit;

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

    // Extract file from formData
    let file: File | null = null;
    try {
      const formData = await request.formData();
      file = formData.get('file') as File | null;
    } catch {
      return apiValidationError([{ message: 'Invalid form data' }]);
    }

    if (!file) {
      return apiValidationError([{ message: 'File is required' }]);
    }

    // Upload via S3
    const uploadResult = await uploadImage(file, authData.userId);

    if (uploadResult.error) {
      return apiError('UPLOAD_FAILED', uploadResult.error, 400);
    }

    const ts = now();

    try {
      const [evidence] = await db
        .insert(disputeEvidences)
        .values({
          id: createId(),
          tenantId,
          disputeId: id,
          uploadedBy: authData.userId,
          fileUrl: uploadResult.url,
          fileType: file.type,
          fileName: file.name,
          createdAt: ts,
        })
        .returning();

      // Log EVIDENCE_ADDED event
      await db.insert(disputeEvents).values({
        id: createId(),
        tenantId,
        disputeId: id,
        actorId: authData.userId,
        eventType: 'EVIDENCE_ADDED',
        createdAt: ts,
      });

      return apiCreated(evidence);
    } catch (error) {
      apiLogger.error({ err: error, disputeId: id }, 'Evidence upload error');
      return apiInternalError();
    }
  }
);
