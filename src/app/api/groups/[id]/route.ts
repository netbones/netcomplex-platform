import { db, groups, users, userGroups, contents } from '@api/db';
import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';

import { apiError, apiNotFound, apiSuccess } from '@api/api-response';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      category: groups.category,
      image: groups.image,
      color: groups.color,
      isPublic: groups.isPublic,
      accessType: groups.accessType,
      residentFilter: groups.residentFilter,
      isActive: groups.isActive,
      createdAt: groups.createdAt,
      updatedAt: groups.updatedAt,
      ownerId: groups.ownerId,
    })
    .from(groups)
    .where(and(eq(groups.id, id), eq(groups.tenantId, tenantId)))
    .limit(1);

  if (!group) {
    return apiNotFound('Not found');
  }

  // Get owner info
  const [owner] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, group.ownerId))
    .limit(1);

  // Get members
  const membersList = await db
    .select({
      id: userGroups.id,
      userId: userGroups.userId,
      groupId: userGroups.groupId,
      role: userGroups.role,
      joinedAt: userGroups.joinedAt,
    })
    .from(userGroups)
    .where(eq(userGroups.groupId, id));

  // Get member users
  const membersWithUsers = await Promise.all(
    membersList.map(async member => {
      const [user] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, member.userId))
        .limit(1);
      return { ...member, user: user ? { id: user.id, name: user.name } : null };
    })
  );

  // Get published contents
  const contentList = await db
    .select({
      id: contents.id,
      title: contents.title,
      content: contents.content,
      excerpt: contents.excerpt,
      category: contents.category,
      authorId: contents.authorId,
      groupId: contents.groupId,
      published: contents.published,
      featured: contents.featured,
      priority: contents.priority,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
      publishedAt: contents.publishedAt,
    })
    .from(contents)
    .where(eq(contents.groupId, id))
    .orderBy(desc(contents.publishedAt))
    .limit(10);

  return apiSuccess({
    ...group,
    owner: owner ? { id: owner.id, name: owner.name } : null,
    members: membersWithUsers,
    contents: contentList,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [group] = await db
    .update(groups)
    .set({
      name: body.name,
      description: body.description,
      category: body.category,
      image: body.image,
      color: body.color,
      isPublic: body.isPublic,
      accessType: body.accessType,
      residentFilter: body.residentFilter,
      updatedAt: new Date(),
    })
    .where(and(eq(groups.id, id), eq(groups.tenantId, tenantId)))
    .returning();

  return apiSuccess(group);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  await db.delete(groups).where(and(eq(groups.id, id), eq(groups.tenantId, tenantId)));

  return apiSuccess({ success: true });
}
