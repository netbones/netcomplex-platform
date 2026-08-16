import {
  db,
  propertyJoinRequests,
  properties,
  invitations,
  tenants,
  users,
  sendEmail,
  templates,
  apiError,
  apiSuccess,
  apiForbidden,
  apiNotFound,
  now,
  withErrorHandler,
} from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant } from '@entities/tenant/server';
import { hasPermission, createComponentLogger } from '@shared/lib';
import { and, eq } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

const log = createComponentLogger('admin-join-requests');
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

/**
 * POST /api/admin/join-requests/[id]
 * Approve or reject a PropertyJoinRequest. Approve extracts street/unit from
 * the linked Property and creates a normal Invitation; reject records a reason
 * and notifies the requester.
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const auth = await requireAuth(request, { permission: 'content' });
    if (!auth.success) return auth.response;

    if (!hasPermission(auth.data.role, 'content')) {
      return apiForbidden('Insufficient permissions');
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;
    const rejectionReason = body?.rejectionReason;

    if (action !== 'approve' && action !== 'reject') {
      return apiError('VALIDATION_ERROR', 'Invalid action', 400);
    }

    const { tenantId } = await withTenant();

    const [joinRequest] = await db
      .select()
      .from(propertyJoinRequests)
      .where(and(eq(propertyJoinRequests.id, id), eq(propertyJoinRequests.tenantId, tenantId)))
      .limit(1);

    if (!joinRequest) {
      return apiNotFound('Join request not found');
    }

    if (joinRequest.status !== 'PENDING') {
      return apiError('VALIDATION_ERROR', 'Join request already processed', 400);
    }

    const ts = now();

    if (action === 'approve') {
      // Resolve linked Property for street/unit extraction.
      const [property] = joinRequest.propertyId
        ? await db
            .select({ street: properties.street, unit: properties.unit })
            .from(properties)
            .where(eq(properties.id, joinRequest.propertyId))
            .limit(1)
        : [];

      const token = createId();
      const acceptUrl = `${BETTER_AUTH_URL}/invite/${token}`;

      const [invitation] = await db
        .insert(invitations)
        .values({
          id: createId(),
          tenantId,
          email: joinRequest.requestedEmail,
          name: `${joinRequest.requestedName}${joinRequest.requestedSurname ? ` ${joinRequest.requestedSurname}` : ''}`.trim(),
          street: property?.street ?? null,
          unit: property?.unit ?? joinRequest.propertyNumberRaw,
          residencyType: joinRequest.relationshipType === 'TENANT_RENTER' ? 'RENTER' : 'OWNER',
          role: 'RESIDENT',
          inviterId: auth.data.userId,
          organizationId: createId(),
          token,
          status: 'PENDING',
          createdAt: ts,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .returning();

      await db
        .update(propertyJoinRequests)
        .set({
          status: 'APPROVED',
          reviewedByUserId: auth.data.userId,
          reviewedAt: ts,
          resultingInvitationId: invitation.id,
          updatedAt: ts,
        })
        .where(eq(propertyJoinRequests.id, id));

      const [tenant] = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      const [inviter] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, auth.data.userId))
        .limit(1);

      void sendEmail({
        to: invitation.email,
        subject: templates.teamInvitation.subject(tenant?.name),
        html: templates.teamInvitation.getHtml(
          invitation.name,
          inviter?.name || 'A community member',
          tenant?.name || 'Netcomplex',
          acceptUrl,
          'RESIDENT',
          tenant?.name || 'Netcomplex'
        ),
      }).catch(err => {
        log.error({ invitationId: invitation.id }, 'Failed to send join-request invitation', err);
      });

      return apiSuccess({ invitation, joinRequestId: id });
    }

    // Reject
    await db
      .update(propertyJoinRequests)
      .set({
        status: 'REJECTED',
        rejectionReason: rejectionReason ?? null,
        reviewedByUserId: auth.data.userId,
        reviewedAt: ts,
        updatedAt: ts,
      })
      .where(eq(propertyJoinRequests.id, id));

    // Reject — G3 resolved: use the dedicated joinRequestRejected template.
    void sendEmail({
      to: joinRequest.requestedEmail,
      subject: templates.joinRequestRejected.subject(),
      html: templates.joinRequestRejected.getHtml(
        joinRequest.requestedName,
        rejectionReason ?? null
      ),
    }).catch(err => {
      log.error({ joinRequestId: id }, 'Failed to send join-request rejection', err);
    });

    return apiSuccess({ joinRequestId: id, status: 'REJECTED' });
  }
);
