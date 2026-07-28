import {
  db,
  groupMembershipRequests,
  users,
  groups,
  apiSuccess,
  apiForbidden,
  withErrorHandler,
} from '@api/server';

import { hasPermission } from '@shared/lib';
import { requireAuth } from '@/shared/api/auth-utils';

import { eq, and, desc } from 'drizzle-orm';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

/**
 * GET /api/groups/membership-requests - List group membership requests
 * Requires authentication and content permission.
 * Supports query params: status (PENDING/ALL, default PENDING), groupId (filter by specific group)
 */
export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;
  const featureCheck = await assertModuleEnabled('groups');
  if (featureCheck) return featureCheck;

  if (!hasPermission(auth.data.role, 'content')) {
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
});
