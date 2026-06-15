import {
  auth,
  db,
  requestHistories,
  users,
  maintenanceRequests,
  revalidateDashboard,
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiError,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, desc, and } from 'drizzle-orm';

import { withTenant } from '@entities/tenant/server';

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const [userResult] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult?.role || 'RESIDENT',
  };
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return apiUnauthorized();
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return apiForbidden();
  }

  // First verify the request belongs to this tenant
  const [mr] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!mr) {
    return apiNotFound('Not found');
  }

  const history = await db
    .select({
      id: requestHistories.id,
      requestId: requestHistories.requestId,
      field: requestHistories.field,
      oldValue: requestHistories.oldValue,
      newValue: requestHistories.newValue,
      comment: requestHistories.comment,
      createdAt: requestHistories.createdAt,
      user: {
        id: users.id,
        name: users.name,
      },
    })
    .from(requestHistories)
    .leftJoin(users, eq(requestHistories.userId, users.id))
    .where(eq(requestHistories.requestId, id))
    .orderBy(desc(requestHistories.createdAt));

  return apiSuccess(history);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return apiUnauthorized();
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return apiForbidden();
  }

  // First verify the request belongs to this tenant
  const [mr] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!mr) {
    return apiNotFound('Not found');
  }

  const body = await request.json();
  const { field, oldValue, newValue, comment } = body;

  if (!field || newValue === undefined) {
    return apiError('VALIDATION_ERROR', 'Missing required fields', 400);
  }

  const historyEntry = await db
    .insert(requestHistories)
    .values({
      id: crypto.randomUUID(),
      requestId: id,
      userId: authData.userId,
      field,
      oldValue: oldValue || null,
      newValue: String(newValue),
      comment: comment || null,
    })
    .returning();

  revalidateDashboard();

  return apiCreated(historyEntry[0]);
}
