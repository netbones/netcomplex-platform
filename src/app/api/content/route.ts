import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ContentCategoryEnum, type ContentCategory } from '@/types/enums';

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
 * GET /api/content - List content/announcements
 * @query category - Filter by NEWS, ANNOUNCEMENT, EVENT, or BLOG
 * @query published - Filter by published status (true/false)
 * @query featured - Filter by featured (true/false)
 * @query groupId - Filter by group ID
 * @query authorId - Filter by author ID
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const published = searchParams.get('published');
  const featured = searchParams.get('featured');
  const groupId = searchParams.get('groupId');
  const authorId = searchParams.get('authorId');

  const where: Record<string, unknown> = {};
  if (category && category in ContentCategoryEnum) {
    where.category = ContentCategoryEnum[category as ContentCategory];
  }
  if (published !== null) where.published = published === 'true';
  if (featured === 'true') where.featured = true;
  if (groupId) where.groupId = groupId;
  if (authorId) where.authorId = authorId;

  const content = await prisma.content.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(content);
}

/**
 * POST /api/content - Create new content (requires content permission)
 * @body title - Content title
 * @body content - Content body
 * @body excerpt - Optional excerpt
 * @body category - Content category
 * @body authorId - Author user ID
 * @body groupId - Optional group ID
 * @body featured - Whether featured
 * @body published - Whether published
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(authData.role, 'content') && !hasPermission(authData.role, 'contentOwn')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  const content = await prisma.content.create({
    data: {
      title: body.title,
      content: body.content,
      excerpt: body.excerpt,
      category: body.category,
      authorId: authData.userId,
      groupId: body.groupId || null,
      featured: body.featured || false,
      published: body.published || false,
      publishedAt: body.published ? new Date() : null,
    },
  });

  return NextResponse.json(content, { status: 201 });
}
