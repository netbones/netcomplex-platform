import {
  db,
  contents,
  users,
  auth,
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  revalidateContent,
} from '@api/server';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import type { ModerationStatus } from '@api/shared';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const role = user?.role || 'RESIDENT';
  if (!hasPermission(role, 'content')) return apiForbidden();

  const { tenantId } = await withTenant();

  const body = await request.json();
  const { moderationStatus } = body as { moderationStatus: ModerationStatus };

  if (
    !moderationStatus ||
    !['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'FLAGGED'].includes(moderationStatus)
  ) {
    return apiError('VALIDATION', 'Invalid moderation status', 400);
  }

  const [existing] = await db
    .select({ id: contents.id })
    .from(contents)
    .where(and(eq(contents.id, id), eq(contents.tenantId, tenantId)))
    .limit(1);

  if (!existing) return apiNotFound('Content not found');

  await db
    .update(contents)
    .set({
      moderationStatus,
      published: moderationStatus === 'PUBLISHED',
      updatedAt: new Date(),
    })
    .where(and(eq(contents.id, id), eq(contents.tenantId, tenantId)));

  revalidateContent();

  return apiSuccess({ id, moderationStatus });
}
