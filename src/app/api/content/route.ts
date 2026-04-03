import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { db, contents, users, groups } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { ContentCategoryEnum, type ContentCategory } from '@/types/enums';
import { revalidateContent } from '@/lib/revalidation';

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
 * GET /api/content - List content/announcements
 * @query category - Filter by NEWS, ANNOUNCEMENT, EVENT, or BLOG
 * @query published - Filter by published status (true/false)
 * @query featured - Filter by featured (true/false)
 * @query groupId - Filter by group ID
 * @query authorId - Filter by author ID (for user's own content)
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const published = searchParams.get('published');
  const featured = searchParams.get('featured');
  const groupId = searchParams.get('groupId');
  const authorId = searchParams.get('authorId');

  // Build where conditions
  const whereConditions = [];

  if (category && category in ContentCategoryEnum) {
    whereConditions.push(eq(contents.category, category as ContentCategory));
  }
  if (published !== null) {
    whereConditions.push(eq(contents.published, published === 'true'));
  }
  if (featured === 'true') {
    whereConditions.push(eq(contents.featured, true));
  }
  if (groupId) {
    whereConditions.push(eq(contents.groupId, groupId));
  }

  // Users can only see their own content unless they have content permission
  const canViewAll = hasPermission(authData.role, 'content');
  if (authorId) {
    whereConditions.push(eq(contents.authorId, authorId));
  } else if (!canViewAll) {
    whereConditions.push(eq(contents.authorId, authData.userId));
  }

  const contentItems = await db
    .select({
      id: contents.id,
      title: contents.title,
      content: contents.content,
      excerpt: contents.excerpt,
      category: contents.category,
      tags: contents.tags,
      authorId: contents.authorId,
      groupId: contents.groupId,
      published: contents.published,
      featured: contents.featured,
      priority: contents.priority,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
      publishedAt: contents.publishedAt,
      expiresAt: contents.expiresAt,
    })
    .from(contents)
    .leftJoin(users, eq(contents.authorId, users.id))
    .leftJoin(groups, eq(contents.groupId, groups.id))
    .where(and(...whereConditions))
    .orderBy(desc(contents.createdAt));

  return NextResponse.json(contentItems);
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

  const now = new Date();
  const [content] = await db
    .insert(contents)
    .values({
      id: crypto.randomUUID(),
      title: body.title,
      content: body.content,
      excerpt: body.excerpt,
      category: body.category,
      authorId: authData.userId,
      groupId: body.groupId || null,
      featured: body.featured || false,
      published: body.published || false,
      publishedAt: body.published ? now : null,
      tags: [],
      priority: 'normal',
      updatedAt: now,
      createdAt: now,
    })
    .returning();

  // Revalidate content caches immediately when new content is created
  revalidateContent();

  return NextResponse.json(content, { status: 201 });
}
