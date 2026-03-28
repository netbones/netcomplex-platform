import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  if (!content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(content);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {
    title: body.title,
    content: body.content,
    excerpt: body.excerpt,
    category: body.category,
    featured: body.featured,
    published: body.published,
  };

  if (body.published && !body.publishedAt) {
    updateData.publishedAt = new Date();
  }

  const content = await prisma.content.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(content);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await prisma.content.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
