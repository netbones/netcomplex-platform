import { requirePermission } from '@/lib/auth-utils';
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
  const authError = await requirePermission('groups');
  if (authError) return authError;

  const body = await request.json();

  const group = await prisma.group.create({
    data: {
      name: body.name,
      description: body.description,
      category: body.category,
      image: body.image,
      isPublic: body.isPublic ?? true,
      ownerId: body.ownerId,
    },
  });

  return NextResponse.json(group, { status: 201 });
}
