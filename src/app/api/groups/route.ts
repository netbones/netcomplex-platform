import { auth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

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

  const groups = await prisma.group.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(groups);
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

  const group = await prisma.group.create({
    data: {
      name: body.name,
      description: body.description,
      category: body.category,
      image: body.image,
      isPublic: body.isPublic ?? true,
      ownerId: body.ownerId || authData.userId,
    },
  });

  return NextResponse.json(group, { status: 201 });
}
