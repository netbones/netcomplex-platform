import {
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
  withErrorHandler,
  getSessionAndRole,
  guardSuspension,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, desc, and } from 'drizzle-orm';

import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }
    const guard = guardSuspension(authData);
    if (guard) return guard;
    const featureCheck = await assertModuleEnabled('maintenance');
    if (featureCheck) return featureCheck;

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
);

export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
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
        id: createId(),
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
);
