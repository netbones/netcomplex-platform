import {
  apiCreated,
  apiForbidden,
  apiSuccess,
  apiValidationError,
  auth,
  db,
  notDeleted,
  resources,
  users,
  withErrorHandler,
} from '@api/server';

import { eq, and, isNull, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 8;

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return null;

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return { userId: session.user.id, role: user?.role || 'RESIDENT' };
}

export const GET = withErrorHandler(async () => {
  const { tenantId } = await withTenant();

  const rows = await db
    .select()
    .from(resources)
    .where(
      and(
        eq(resources.tenantId, tenantId),
        eq(resources.category, 'EDUCATION'),
        notDeleted(resources)
      )
    )
    .orderBy(desc(resources.createdAt));

  return apiSuccess(rows);
});

export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData || !hasPermission(authData.role, 'admin')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const body = await request.json();

  if (!body.title || typeof body.title !== 'string') {
    return apiValidationError([{ message: 'Title is required' }]);
  }

  const id = uuidv4();
  const now = new Date();
  await db.insert(resources).values({
    id,
    tenantId,
    title: body.title,
    description: body.description ?? null,
    category: 'EDUCATION',
    externalUrl: body.externalUrl ?? null,
    provider: body.provider ?? null,
    tags: body.tags ?? [],
    mediaType: body.mediaType ?? null,
    featured: body.featured ?? false,
    visibility: 'ALL_RESIDENTS',
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  const [created] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  return apiCreated(created);
});
