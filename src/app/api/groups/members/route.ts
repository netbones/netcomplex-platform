import {
  db,
  userGroups,
  apiCreated,
  apiError,
  apiSuccess,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, groupId, role = 'MEMBER' } = body;

  // Check for existing membership
  const [existing] = await db
    .select({ id: userGroups.id })
    .from(userGroups)
    .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)))
    .limit(1);

  if (existing) {
    return apiError('VALIDATION_ERROR', 'Already a member', 400);
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [membership] = await db
    .insert(userGroups)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      userId,
      groupId,
      role,
      joinedAt: new Date(),
    })
    .returning();

  return apiCreated(membership);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const groupId = searchParams.get('groupId');

  if (!userId || !groupId) {
    return apiError('VALIDATION_ERROR', 'Missing userId or groupId', 400);
  }

  const { tenantId } = await withTenant();

  await db
    .delete(userGroups)
    .where(
      and(
        eq(userGroups.tenantId, tenantId),
        eq(userGroups.userId, userId),
        eq(userGroups.groupId, groupId)
      )
    );

  return apiSuccess({ success: true });
}
