import {
  auth,
  db,
  users,
  platformSuspensions,
  apiUnauthorized,
  apiForbidden,
  apiSuccess,
} from '@api/server';

import { hasPermission } from '@entities/tenant';

import { eq, desc, and } from 'drizzle-orm';

import { withTenant } from '@entities/tenant';

export const maxDuration = 8;

/**
 * GET /api/users/[id]/suspensions - Retrieve suspension history for a user.
 * Returns all past and present suspension records, ordered by most recent first.
 * Only ADMIN/MANAGER roles with 'users' permission can view suspension history.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId } = await withTenant();

  // Authentication: verify session and check admin permission
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  const [adminUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const adminRole = adminUser?.role || 'RESIDENT';
  if (!hasPermission(adminRole, 'users')) {
    return apiForbidden('Insufficient permissions');
  }

  // Fetch all suspensions for this user, ordered by most recent first
  const suspensions = await db
    .select({
      id: platformSuspensions.id,
      userId: platformSuspensions.userId,
      suspensionType: platformSuspensions.suspensionType,
      reason: platformSuspensions.reason,
      description: platformSuspensions.description,
      startDate: platformSuspensions.startDate,
      endDate: platformSuspensions.endDate,
      isPermanent: platformSuspensions.isPermanent,
      isActive: platformSuspensions.isActive,
      createdById: platformSuspensions.createdById,
      createdAt: platformSuspensions.createdAt,
      updatedAt: platformSuspensions.updatedAt,
    })
    .from(platformSuspensions)
    .where(and(eq(platformSuspensions.userId, id), eq(platformSuspensions.tenantId, tenantId)))
    .orderBy(desc(platformSuspensions.createdAt));

  return apiSuccess({ suspensions });
}
