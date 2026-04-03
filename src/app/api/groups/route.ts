import { auth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { db, groups, users, userGroups } from '@/lib/db';
import { eq, asc, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

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
 * GET /api/groups - List all active community groups
 * Requires authentication. Residents can view groups, admins can manage.
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canView =
    hasPermission(authData.role, 'groups') ||
    hasPermission(authData.role, 'groupsOwn') ||
    authData.role === 'RESIDENT';
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
    })
    .from(groups)
    .where(eq(groups.isActive, true))
    .orderBy(asc(groups.name));

  // Get member counts for each group
  const groupsWithCounts = await Promise.all(
    groupList.map(async group => {
      const members = await db
        .select({ id: userGroups.id })
        .from(userGroups)
        .where(eq(userGroups.groupId, group.id));

      return {
        ...group,
        owner: { id: group.ownerId, name: '' },
        _count: { members: members.length },
      };
    })
  );

  return NextResponse.json(groupsWithCounts);
}

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
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canCreateGroup =
    hasPermission(authData.role, 'groups') || hasPermission(authData.role, 'groupsOwn');
  if (!canCreateGroup) {
    return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const now = new Date();

  const [group] = await db
    .insert(groups)
    .values({
      id: crypto.randomUUID(),
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
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(group, { status: 201 });
}
