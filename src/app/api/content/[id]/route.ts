import { db, contents, users, groups } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [content] = await db
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
    .where(eq(contents.id, id))
    .limit(1);

  if (!content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Transform to match original response format
  const result = {
    id: content.id,
    title: content.title,
    content: content.content,
    excerpt: content.excerpt,
    category: content.category,
    tags: content.tags,
    authorId: content.authorId,
    groupId: content.groupId,
    published: content.published,
    featured: content.featured,
    priority: content.priority,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    publishedAt: content.publishedAt,
    expiresAt: content.expiresAt,
    author: content.authorId ? { id: content.authorId, name: '' } : null,
    group: content.groupId ? { id: content.groupId, name: '' } : null,
  };

  return NextResponse.json(result);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {
    title: body.title,
    content: body.content,
    excerpt: body.excerpt,
    category: body.category,
    groupId: body.groupId || null,
    featured: body.featured,
    published: body.published,
    updatedAt: new Date(),
  };

  if (body.published && !body.publishedAt) {
    updateData.publishedAt = new Date();
  }

  const [content] = await db
    .update(contents)
    .set(updateData)
    .where(eq(contents.id, id))
    .returning();

  return NextResponse.json(content);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await db.delete(contents).where(eq(contents.id, id));

  return NextResponse.json({ success: true });
}
