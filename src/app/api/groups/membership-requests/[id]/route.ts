import {
  db,
  groupMembershipRequests,
  groupMembers,
  users,
  groups,
  apiError,
  apiSuccess,
  apiForbidden,
  apiNotFound,
  now,
  withErrorHandler,
} from '@api/server';

import { hasPermission } from '@shared/lib';
import { requireAuth } from '@/shared/api/auth-utils';

import { eq, and } from 'drizzle-orm';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { notDeleted } from '@api/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/**
 * POST /api/groups/membership-requests/[id] - Approve or reject a membership request
 * Requires authentication and content permission.
 * Body: { action: 'approve' | 'reject' }
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id: requestId } = await params;
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;
    const featureCheck = await assertModuleEnabled('groups');
    if (featureCheck) return featureCheck;

    if (!hasPermission(auth.data.role, 'content')) {
      return apiForbidden('Insufficient permissions');
    }

    const body = await request.json();
    const { action } = body;

    if (!action || (action !== 'approve' && action !== 'reject')) {
      return apiError('VALIDATION_ERROR', 'Invalid action. Must be "approve" or "reject"', 400);
    }

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Find the membership request with tenant scoping
    const [existingRequest] = await db
      .select()
      .from(groupMembershipRequests)
      .where(
        and(
          eq(groupMembershipRequests.id, requestId),
          eq(groupMembershipRequests.tenantId, tenantId),
          notDeleted(groupMembershipRequests)
        )
      )
      .limit(1);

    if (!existingRequest) {
      return apiNotFound('Membership request not found');
    }

    if (existingRequest.status !== 'PENDING') {
      return apiError('VALIDATION_ERROR', 'Membership request has already been processed', 400);
    }

    const ts = now();

    if (action === 'approve') {
      // Update request status to APPROVED
      await db
        .update(groupMembershipRequests)
        .set({ status: 'APPROVED', updatedAt: ts })
        .where(eq(groupMembershipRequests.id, requestId));

      // Create a GroupMember record with role=MEMBER
      // Check for existing membership first (unique constraint on userId+groupId)
      const [existingMembership] = await db
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.userId, existingRequest.userId),
            eq(groupMembers.groupId, existingRequest.groupId)
          )
        )
        .limit(1);

      if (!existingMembership) {
        await db.insert(groupMembers).values({
          id: createId(),
          tenantId,
          userId: existingRequest.userId,
          groupId: existingRequest.groupId,
          role: 'MEMBER',
          joinedAt: ts,
        });
      }

      // Fetch full response with user and group details
      const [fullRequest] = await db
        .select({
          id: groupMembershipRequests.id,
          userId: groupMembershipRequests.userId,
          groupId: groupMembershipRequests.groupId,
          status: groupMembershipRequests.status,
          message: groupMembershipRequests.message,
          createdAt: groupMembershipRequests.createdAt,
          user: {
            name: users.name,
            email: users.email,
          },
          group: {
            name: groups.name,
            accessType: groups.accessType,
          },
        })
        .from(groupMembershipRequests)
        .leftJoin(users, eq(groupMembershipRequests.userId, users.id))
        .leftJoin(groups, eq(groupMembershipRequests.groupId, groups.id))
        .where(eq(groupMembershipRequests.id, requestId))
        .limit(1);

      return apiSuccess({ request: fullRequest });
    }

    // action === 'reject'
    await db
      .update(groupMembershipRequests)
      .set({ status: 'REJECTED', updatedAt: ts })
      .where(eq(groupMembershipRequests.id, requestId));

    // Fetch full response with user and group details
    const [fullRequest] = await db
      .select({
        id: groupMembershipRequests.id,
        userId: groupMembershipRequests.userId,
        groupId: groupMembershipRequests.groupId,
        status: groupMembershipRequests.status,
        message: groupMembershipRequests.message,
        createdAt: groupMembershipRequests.createdAt,
        user: {
          name: users.name,
          email: users.email,
        },
        group: {
          name: groups.name,
          accessType: groups.accessType,
        },
      })
      .from(groupMembershipRequests)
      .leftJoin(users, eq(groupMembershipRequests.userId, users.id))
      .leftJoin(groups, eq(groupMembershipRequests.groupId, groups.id))
      .where(eq(groupMembershipRequests.id, requestId))
      .limit(1);

    return apiSuccess({ request: fullRequest });
  }
);
