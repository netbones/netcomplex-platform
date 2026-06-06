import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant';
import { db, groupMembershipRequests, users, groups } from '@api/db';
import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';

import { apiError, apiSuccess, apiUnauthorized, apiForbidden } from '@api/api-response';
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
 * GET /api/groups/membership-requests - List group membership requests
 * Requires authentication and content permission.
 * Supports query params: status (PENDING/ALL, default PENDING), groupId (filter by specific group)
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'content')) {
    return apiForbidden('Insufficient permissions');
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || 'PENDING';
  const groupIdFilter = searchParams.get('groupId');

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Build where conditions array
  const conditions: ReturnType<typeof eq>[] = [eq(groupMembershipRequests.tenantId, tenantId)];

  // Apply status filter
  if (statusFilter !== 'ALL') {
    conditions.push(
      eq(groupMembershipRequests.status, statusFilter as 'PENDING' | 'APPROVED' | 'REJECTED')
    );
  }

  // Apply groupId filter if provided
  if (groupIdFilter) {
    conditions.push(eq(groupMembershipRequests.groupId, groupIdFilter));
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  // Query membership requests joined with users and groups
  const requests = await db
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
    .where(whereClause)
    .orderBy(desc(groupMembershipRequests.createdAt));

  return apiSuccess({ requests });
}
