import {
  db,
  groupMembers,
  apiCreated,
  apiError,
  apiSuccess,
  apiUnauthorized,
  getSessionAndRole,
  now,
  withErrorHandler,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();

  const body = await request.json();
  const { userId, groupId, role = 'MEMBER' } = body;

  // Check for existing membership
  const [existing] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)))
    .limit(1);

  if (existing) {
    return apiError('VALIDATION_ERROR', 'Already a member', 400);
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [membership] = await db
    .insert(groupMembers)
    .values({
      id: createId(),
      tenantId,
      userId,
      groupId,
      role,
      joinedAt: now(),
    })
    .returning();

  return apiCreated(membership);
});

export const DELETE = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const groupId = searchParams.get('groupId');

  if (!userId || !groupId) {
    return apiError('VALIDATION_ERROR', 'Missing userId or groupId', 400);
  }

  const { tenantId } = await withTenant();

  await db
    .update(groupMembers)
    .set({ deletedAt: now() })
    .where(
      and(
        eq(groupMembers.tenantId, tenantId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.groupId, groupId)
      )
    );

  return apiSuccess({ success: true });
});
