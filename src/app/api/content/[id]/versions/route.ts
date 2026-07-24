import {
  db,
  contentVersions,
  users,
  auth,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  withErrorHandler,
} from '@api/server';
import { eq, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';

export const maxDuration = 8;

export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!hasPermission(user?.role || 'RESIDENT', 'content')) return apiForbidden();

    await withTenant();

    const versions = await db
      .select({
        id: contentVersions.id,
        version: contentVersions.version,
        snapshot: contentVersions.snapshot,
        userId: contentVersions.userId,
        changeSummary: contentVersions.changeSummary,
        createdAt: contentVersions.createdAt,
      })
      .from(contentVersions)
      .where(eq(contentVersions.contentId, id))
      .orderBy(desc(contentVersions.version));

    return apiSuccess(versions);
  }
);
