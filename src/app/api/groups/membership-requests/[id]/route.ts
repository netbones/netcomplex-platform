import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { db, groupMembershipRequests, userGroups, users, groups } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { withTenant } from '@entities/tenant/api/with-tenant';

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(authData.role, 'content')) {
    return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body;

  if (!action || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json(
      { error: 'Invalid action. Must be "approve" or "reject"' },
      { status: 400 }
    );
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
    return NextResponse.json({ error: 'Membership request not found' }, { status: 404 });
  }

  if (existingRequest.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Membership request has already been processed' },
      { status: 400 }
    );
  }

  const now = new Date();

  if (action === 'approve') {
    // Update request status to APPROVED
    await db
      .update(groupMembershipRequests)
      .set({ status: 'APPROVED', updatedAt: now })
      .where(eq(groupMembershipRequests.id, requestId));

    // Create a UserGroup record with role=MEMBER
    // Check for existing membership first (unique constraint on userId+groupId)
    const [existingMembership] = await db
      .select({ id: userGroups.id })
      .from(userGroups)
      .where(
        and(
          eq(userGroups.userId, existingRequest.userId),
          eq(userGroups.groupId, existingRequest.groupId)
        )
      )
      .limit(1);

    if (!existingMembership) {
      await db.insert(userGroups).values({
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

    return NextResponse.json({ request: fullRequest });
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

  return NextResponse.json({ request: fullRequest });
}
