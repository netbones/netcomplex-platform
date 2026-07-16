import {
  auth,
  db,
  groups,
  users,
  groupMembers,
  apiCreated,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  notDeleted,
  now,
  emitEvent,
  withErrorHandler,
  getSessionAndRole,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and, asc, inArray, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/**
 * Retrieves session and role from the request for API routes.
 * @param request - Incoming HTTP request
 * @returns Session data with user ID and role, or null if not authenticated
 */
/**
 * GET /api/groups - List all active community groups
 * Requires authentication. Residents can view groups, admins can manage.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  const canView =
    hasPermission(authData.role, 'groups') ||
    hasPermission(authData.role, 'groupsOwn') ||
    authData.role === 'RESIDENT';
  if (!canView) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();

  const groupList = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      category: groups.category,
      image: groups.image,
      color: groups.color,
      isPublic: groups.isPublic,
      accessType: groups.accessType,
      residentFilter: groups.residentFilter,
      isActive: groups.isActive,
      createdAt: groups.createdAt,
      updatedAt: groups.updatedAt,
      ownerId: groups.ownerId,
      ownerName: users.name,
    })
    .from(groups)
    .leftJoin(users, eq(groups.ownerId, users.id))
    .where(and(notDeleted(groups), eq(groups.isActive, true), eq(groups.tenantId, tenantId)))
    .orderBy(asc(groups.name));

  const groupIds = groupList.map(g => g.id);

  const memberCounts =
    groupIds.length > 0
      ? await db
          .select({
            groupId: groupMembers.groupId,
            count: sql<number>`count(*)::int`,
          })
          .from(groupMembers)
          .where(and(eq(groupMembers.tenantId, tenantId), inArray(groupMembers.groupId, groupIds)))
          .groupBy(groupMembers.groupId)
      : [];

  const countByGroupId = new Map(memberCounts.map(r => [r.groupId, r.count]));

  const groupsWithCounts = groupList.map(group => ({
    ...group,
    owner: { id: group.ownerId, name: group.ownerName ?? 'Unknown' },
    _count: { members: countByGroupId.get(group.id) ?? 0 },
  }));

  return apiSuccess(groupsWithCounts);
});

/**
 * POST /api/groups - Create a new community group
 * Requires groups or groupsOwn permission
 * @body name - Group name
 * @body description - Group description
 * @body category - Group category
 * @body image - Optional image URL
 * @body isPublic - Whether group is publicly visible
 * @body ownerId - Optional owner ID (defaults to authenticated user)
 */
export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) {
    return apiUnauthorized();
  }

  const canCreateGroup =
    hasPermission(authData.role, 'groups') || hasPermission(authData.role, 'groupsOwn');
  if (!canCreateGroup) {
    return apiForbidden('Insufficient permissions');
  }

  const body = await request.json();
  const ts = now();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [group] = await db
    .insert(groups)
    .values({
      id: createId(),
      tenantId,
      name: body.name,
      description: body.description,
      category: body.category,
      image: body.image,
      isPublic: body.isPublic ?? true,
      ownerId: body.ownerId || authData.userId,
      color: '#4F46E5',
      accessType: 'OPEN',
      residentFilter: 'ALL',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();

  emitEvent('group.joined', {
    tenantId,
    userId: authData.userId,
    groupId: group.id,
  });

  return apiCreated(group);
});
