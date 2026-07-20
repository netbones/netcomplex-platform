import {
  auth,
  db,
  conversations,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  now,
  notDeleted,
  withErrorHandler,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

/** @deprecated Use `trpc.conversations.listConversations` instead */
export const GET = withErrorHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: _request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const { tenantId } = await withTenant();

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.tenantId, tenantId),
          notDeleted(conversations)
        )
      )
      .limit(1);

    if (!conversation) return apiNotFound('Conversation not found');

    return apiSuccess(conversation);
  }
);

export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const { tenantId } = await withTenant();

    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.tenantId, tenantId),
          notDeleted(conversations)
        )
      )
      .limit(1);

    if (!conversation) return apiNotFound('Conversation not found');

    await db
      .update(conversations)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(eq(conversations.id, conversation.id));

    return apiSuccess({ success: true });
  }
);
