import { requirePermission, requireOwnPermission, getSessionAndRole } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const authError = await requirePermission('groups');
  if (authError) return authError;

  const groups = await prisma.group.findMany({
    orderBy: { name: 'asc' },
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(groups);
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole();
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
