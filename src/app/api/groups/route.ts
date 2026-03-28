import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
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
