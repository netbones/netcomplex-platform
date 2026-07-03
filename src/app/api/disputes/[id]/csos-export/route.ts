import {
  apiForbidden,
  apiNotFound,
  apiUnauthorized,
  auth,
  db,
  disputeCases,
  disputeEvents,
  disputeEvidences,
  disputeMessageVersions,
  disputeMessages,
  notDeleted,
  now,
  rateLimitByKey,
  settings,
  users,
  withErrorHandler,
} from '@api/server';
import { hasPermission } from '@shared/lib';
import { eq, and, isNull, asc, gte, inArray, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { NextResponse } from 'next/server';
import { buildCsosExportPdf } from './build-csos-pdf';
import { createId } from '@shared/lib/id';

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
 * Returns certified PDF for CSOS Form 2 submission.
 * Rate limited to 3 exports per case per day (Redis + DB fallback).
 * Each export is audit logged.
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId, tenantSlug } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }

    // Fetch dispute with tenant scoping and soft-delete exclusion
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

    // Access control: complainant (own disputes) OR BOARD/ADMIN
    const isOwner = dispute.complainantId === authData.userId;
    const isModerator = authData.role === 'BOARD' || hasPermission(authData.role, 'admin');
    if (!isOwner && !isModerator) {
      return apiForbidden();
    }

    // Rate limit: 3 exports per case per day (Redis primary)
    const rateLimitKey = `csos-export:${id}:${authData.userId}`;
    const rateLimit = await rateLimitByKey(rateLimitKey, {
      windowMs: 86_400_000,
      maxRequests: 3,
    });
    if (rateLimit) return rateLimit;

    // DB-based rate limit fallback when Redis unavailable
    if (!rateLimit) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [exportCountToday] = await db
        .select({ count: sql<number>`count(*)` })
        .from(disputeEvents)
        .where(
          and(
            eq(disputeEvents.disputeId, id),
            eq(disputeEvents.tenantId, tenantId),
            eq(disputeEvents.actorId, authData.userId),
            eq(disputeEvents.eventType, 'NOTE_ADDED'),
            gte(disputeEvents.createdAt, today)
          )
        );
      const count = Number(exportCountToday?.count ?? 0);
      if (count >= 3) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'CSOS export limit reached (3 per day). Try again tomorrow.',
            },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch events for timeline
    const events = await db
      .select()
      .from(disputeEvents)
      .where(and(eq(disputeEvents.disputeId, id), eq(disputeEvents.tenantId, tenantId)))
      .orderBy(asc(disputeEvents.createdAt));

    // Fetch evidence (non-deleted)
    const evidence = await db
      .select()
      .from(disputeEvidences)
      .where(
        and(
          eq(disputeEvidences.disputeId, id),
          eq(disputeEvidences.tenantId, tenantId),
          notDeleted(disputeEvidences)
        )
      );

    // Fetch messages (non-internal, non-deleted)
    const messages = await db
      .select()
      .from(disputeMessages)
      .where(
        and(
          eq(disputeMessages.disputeId, id),
          eq(disputeMessages.tenantId, tenantId),
          eq(disputeMessages.isInternal, false),
          notDeleted(disputeMessages)
        )
      )
      .orderBy(asc(disputeMessages.createdAt));

    // Fetch message versions for edited messages
    const editedMessageIds = messages.filter(m => m.editedAt).map(m => m.id);
    const messageVersions =
      editedMessageIds.length > 0
        ? await db
            .select()
            .from(disputeMessageVersions)
            .where(inArray(disputeMessageVersions.messageId, editedMessageIds))
            .orderBy(asc(disputeMessageVersions.editedAt))
        : [];

    // Fetch tenant CSOS settings
    const [csosSetting] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, 'csos')))
      .limit(1);

    let csosRegNo: string | null = null;
    if (csosSetting?.value) {
      try {
        const parsed = JSON.parse(csosSetting.value as string);
        csosRegNo = parsed?.schemeRegistration ?? null;
      } catch {
        csosRegNo = null;
      }
    }

    // Build PDF
    const pdfBytes = await buildCsosExportPdf({
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
        desiredOutcome: dispute.desiredOutcome ?? null,
      },
      events: events.map(evt => ({
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
        createdAt: ev.createdAt,
      })),
      messages: messages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        content: m.content,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
      })),
      messageVersions: messageVersions.map(v => ({
        messageId: v.messageId,
        originalContent: v.originalContent,
        editedAt: v.editedAt,
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
      tenant: {
        name: tenantSlug || 'Netcomplex',
        csosRegNo,
      },
    });

    // Log export as NOTE_ADDED DisputeEvent
    await db.insert(disputeEvents).values({
      id: createId(),
      tenantId,
      disputeId: id,
      actorId: authData.userId,
      eventType: 'NOTE_ADDED',
      metadata: { action: 'csos_export', exportedAt: new Date().toISOString() },
      createdAt: now(),
    });

    // Return binary PDF
    const pdfBuffer = pdfBytes.slice().buffer as ArrayBuffer;
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="csos-export-${dispute.referenceNumber}.pdf"`,
        'Content-Length': pdfBytes.byteLength.toString(),
      },
    });
  }
);

/** Mask complainant name when confidential and mediation not yet accepted */
function resolveComplainantName(
  dispute: {
    isConfidential: boolean;
    mediationAcceptedAt: Date | string | null;
  },
  authData: { userId: string; role: string }
): string {
  if (dispute.isConfidential && !dispute.mediationAcceptedAt) {
    return 'Complainant';
  }
  return authData.userId;
}
