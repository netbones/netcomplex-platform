import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
      contents: { where: { published: true }, orderBy: { publishedAt: 'desc' }, take: 10 },
    },
  });

  if (!group) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(group);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const group = await prisma.group.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      category: body.category,
      image: body.image,
      isPublic: body.isPublic,
    },
  });

  return NextResponse.json(group);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await prisma.group.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
