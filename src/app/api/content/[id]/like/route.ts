import {
  auth,
  db,
  contentLikes,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiConflict,
  withErrorHandler,
} from '@api/server';

import { count, eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    const { tenantId } = await withTenant();

    const [{ count: totalLikes }] = await db
      .select({ count: count() })
      .from(contentLikes)
      .where(and(eq(contentLikes.contentId, id), eq(contentLikes.tenantId, tenantId)));

    const userId = session?.user?.id;

    let liked = false;
    if (userId) {
      const [existing] = await db
        .select({ id: contentLikes.id })
        .from(contentLikes)
        .where(
          and(
            eq(contentLikes.contentId, id),
            eq(contentLikes.userId, userId),
            eq(contentLikes.tenantId, tenantId)
          )
        )
        .limit(1);
      liked = !!existing;
    }

    return apiSuccess({ likes: totalLikes, liked });
  }
);

export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const { tenantId } = await withTenant();
    const userId = session.user.id;

    const [existing] = await db
      .select({ id: contentLikes.id })
      .from(contentLikes)
      .where(and(eq(contentLikes.contentId, id), eq(contentLikes.userId, userId)))
      .limit(1);

    if (existing) {
      return apiConflict('Already liked this post');
    }

    const [like] = await db
      .insert(contentLikes)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        contentId: id,
        userId,
      })
      .returning();

    return apiSuccess(like);
  }
);

export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const userId = session.user.id;

    const [deleted] = await db
      .delete(contentLikes)
      .where(and(eq(contentLikes.contentId, id), eq(contentLikes.userId, userId)))
      .returning();

    if (!deleted) return apiNotFound('Not liked yet');

    return apiSuccess({ success: true });
  }
);
