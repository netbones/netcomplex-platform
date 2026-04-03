import { NextResponse } from 'next/server';
import { db, contents, users } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
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
      .where(eq(contents.published, true))
      .orderBy(desc(contents.publishedAt))
      .limit(3);

    return NextResponse.json(contentList);
  } catch (error) {
    console.error('Failed to fetch conservation content:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
