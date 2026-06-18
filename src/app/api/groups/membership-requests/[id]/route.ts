import {
  auth,
  db,
  groupMembershipRequests,
  groupMembers,
  users,
  groups,
  apiError,
  apiGone,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  notDeleted,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

/**
 * Retrieves session and role from the request for API routes.
 * @param request - Incoming HTTP request
 * @returns Session data with user ID and role, or null if not authenticated
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: user?.role || 'RESIDENT',
  };
}

/**
 * POST /api/groups/membership-requests/[id] - Approve or reject a membership request
 * Requires authentication and content permission.
 * Body: { action: 'approve' | 'reject' }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params;
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'content')) {
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
      and(eq(groupMembershipRequests.id, requestId), eq(groupMembershipRequests.tenantId, tenantId))
    )
    .limit(1);

  if (!existingRequest) {
    return apiNotFound('Membership request not found');
  }

  if (existingRequest.deletedAt) {
    return apiGone('This record has been deleted');
  }

  if (existingRequest.status !== 'PENDING') {
    return apiError('VALIDATION_ERROR', 'Membership request has already been processed', 400);
  }

  const now = new Date();

  if (action === 'approve') {
    // Update request status to APPROVED
    await db
      .update(groupMembershipRequests)
      .set({ status: 'APPROVED', updatedAt: now })
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
        id: crypto.randomUUID(),
        tenantId,
        userId: existingRequest.userId,
        groupId: existingRequest.groupId,
        role: 'MEMBER',
        joinedAt: now,
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
    .set({ status: 'REJECTED', updatedAt: now })
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
