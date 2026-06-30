import {
  auth,
  db,
  users,
  messages,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiInternalError,
} from '@api/server';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { hasPermission } from '@shared/lib';
import { apiLogger } from '@/shared/lib/logger';

export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!hasPermission(user?.role || 'RESIDENT', 'admin')) return apiForbidden();

  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const purgedMessages = await db
      .delete(messages)
      .where(and(isNotNull(messages.deletedAt), lt(messages.deletedAt, cutoff)))
      .returning({ id: messages.id });

    return apiSuccess({ purged: { messages: purgedMessages.length } });
  } catch (error) {
    apiLogger.error({ error }, '[PURGE] Error');
    return apiInternalError();
  }
}
