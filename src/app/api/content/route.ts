import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const published = searchParams.get('published');
  const featured = searchParams.get('featured');
  const groupId = searchParams.get('groupId');

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (published !== null) where.published = published === 'true';
  if (featured === 'true') where.featured = true;
  if (groupId) where.groupId = groupId;

  const content = await prisma.content.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    include: {
      author: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(content);
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(authData.role, 'content')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  const content = await prisma.content.create({
    data: {
      title: body.title,
      content: body.content,
      excerpt: body.excerpt,
      category: body.category,
      authorId: body.authorId,
      groupId: body.groupId || null,
      featured: body.featured || false,
      published: body.published || false,
      publishedAt: body.published ? new Date() : null,
    },
  });

  return NextResponse.json(content, { status: 201 });
}
