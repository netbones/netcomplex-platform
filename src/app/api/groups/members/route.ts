import { z } from 'zod/v4';
import {
  db,
  groupMembers,
  apiCreated,
  apiError,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  getSessionAndRole,
  now,
  withErrorHandler,
  guardSuspension,
  rateLimitByUser,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

const groupMemberCreateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  groupId: z.string().min(1, 'Group ID is required'),
  role: z.enum(['MEMBER', 'ADMIN', 'MODERATOR']).optional().default('MEMBER'),
});

export const maxDuration = 8;

/** @deprecated Use `trpc.groups.joinGroup` instead */
export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();
  const guard = guardSuspension(authData);
  if (guard) return guard;

  const rateLimit = await rateLimitByUser(authData.userId, {
    windowMs: 60_000,
    maxRequests: 10,
  });
  if (rateLimit) return rateLimit;

  const body = await request.json();

  const parsed = groupMemberCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { userId, groupId, role } = parsed.data;

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

/** @deprecated Use `trpc.groups.removeMember` instead */
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
