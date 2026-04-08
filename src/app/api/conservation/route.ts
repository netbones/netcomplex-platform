import { NextResponse } from 'next/server';
import { db, contents, users } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { withTenantOptional } from '@/lib/tenant/with-tenant';
import { logError } from '@/lib/logging';

export async function GET() {
  try {
    // Use optional tenant - fallback to default for public access
    let { tenantId } = await withTenantOptional();
    if (!tenantId) {
      tenantId = 'soralia'; // Default tenant for public pages
    }

    const contentList = await db
      .select({
        id: contents.id,
        title: contents.title,
        excerpt: contents.excerpt,
        image: contents.image,
        category: contents.category,
        publishedAt: contents.publishedAt,
        author: {
          name: users.name,
        },
      })
      .from(contents)
      .leftJoin(users, eq(contents.authorId, users.id))
      .where(and(eq(contents.published, true), eq(contents.tenantId, tenantId)))
      .orderBy(desc(contents.publishedAt))
      .limit(3);

    return NextResponse.json(contentList);
  } catch (error) {
    logError(
      { component: 'conservation-api', operation: 'GET' },
      'Failed to fetch conservation content',
      error
    );
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
