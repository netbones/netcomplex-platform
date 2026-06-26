import {
  auth,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  db,
  disputeCases,
  disputeEvents,
  disputeEvidences,
  users,
  now,
  withErrorHandler,
} from '@api/server';
import { hasPermission } from '@shared/lib';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { rateLimitByKey } from '@api/server';

export const maxDuration = 8;

/** Get session and role from request (inline per plan pattern). */
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
 * GET /api/disputes/[id]/csos-export
 * Returns structured JSON event log for CSOS Form 2 submission.
 * Rate limited to 3 exports per case per day, each export audit logged.
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }

    // Fetch dispute with tenant scoping and soft-delete exclusion
    const [dispute] = await db
      .select()
      .from(disputeCases)
      .where(
        and(
          eq(disputeCases.id, id),
          eq(disputeCases.tenantId, tenantId),
          isNull(disputeCases.deletedAt)
        )
      )
      .limit(1);

    if (!dispute) {
      return apiNotFound('Not found');
    }

    // Access control: complainant (own disputes) OR BOARD/ADMIN
    const isOwner = dispute.complainantId === authData.userId;
    const isModerator = authData.role === 'BOARD' || hasPermission(authData.role, 'admin');
    if (!isOwner && !isModerator) {
      return apiForbidden();
    }

    // Rate limit: 3 exports per case per day
    const rateLimitKey = `csos-export:${id}:${authData.userId}`;
    const rateLimit = await rateLimitByKey(rateLimitKey, {
      windowMs: 86_400_000,
      maxRequests: 3,
    });
    if (rateLimit) return rateLimit;

    // Fetch events for timeline
    const events = await db
      .select()
      .from(disputeEvents)
      .where(and(eq(disputeEvents.disputeId, id), eq(disputeEvents.tenantId, tenantId)))
      .orderBy(asc(disputeEvents.createdAt));

    // Fetch evidence
    const evidence = await db
      .select()
      .from(disputeEvidences)
      .where(
        and(
          eq(disputeEvidences.disputeId, id),
          eq(disputeEvidences.tenantId, tenantId),
          isNull(disputeEvidences.deletedAt)
        )
      );

    // Build 6-section CSOS export object
    const exportData = {
      parties: {
        complainant: resolveComplainantName(dispute, authData),
        respondent: dispute.respondentId ?? 'N/A',
        respondentType: dispute.respondentType,
      },
      summary: {
        referenceNumber: dispute.referenceNumber,
        title: dispute.title,
        description: dispute.description,
        category: dispute.category,
        severity: dispute.severity,
        status: dispute.status,
        submittedAt: dispute.submittedAt,
        resolvedAt: dispute.resolvedAt,
      },
      resolutionHistory: events.map(evt => ({
        eventType: evt.eventType,
        fromStatus: evt.fromStatus,
        toStatus: evt.toStatus,
        actorId: evt.actorId,
        note: evt.note,
        metadata: evt.metadata,
        createdAt: evt.createdAt,
      })),
      evidence: evidence.map(ev => ({
        fileName: ev.fileName,
        fileType: ev.fileType,
        fileUrl: ev.fileUrl,
        uploadedBy: ev.uploadedBy,
        createdAt: ev.createdAt,
      })),
      ruling: dispute.rulingDescription
        ? {
            description: dispute.rulingDescription,
            issuedAt: dispute.rulingIssuedAt,
          }
        : null,
      certification: {
        exportedAt: new Date().toISOString(),
        exportedBy: authData.userId,
      },
    };

    // Log export as NOTE_ADDED DisputeEvent
    await db.insert(disputeEvents).values({
      id: crypto.randomUUID(),
      tenantId,
      disputeId: id,
      actorId: authData.userId,
      eventType: 'NOTE_ADDED',
      metadata: { exportType: 'CSOS', exportedAt: new Date().toISOString() },
      createdAt: now(),
    });

    return apiSuccess(exportData);
  }
);

/** Mask complainant name when confidential and mediation not yet accepted */
function resolveComplainantName(
  dispute: { isConfidential: boolean; mediationAcceptedAt: Date | null },
  authData: { userId: string; role: string }
): string {
  if (dispute.isConfidential && !dispute.mediationAcceptedAt) {
    return 'Complainant';
  }
  return authData.userId;
}
