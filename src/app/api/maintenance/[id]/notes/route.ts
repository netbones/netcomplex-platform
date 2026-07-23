import {
  db,
  requestNotes,
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

/** @deprecated Use `trpc.maintenance.listNotes` instead */
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

    // First verify the request belongs to this tenant
    const [mr] = await db
      .select()
      .from(maintenanceRequests)
      .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
      .limit(1);

    if (!mr) {
      return apiNotFound('Not found');
    }

    // Admin sees all notes; residents see only non-internal notes
    // Fixed: previously returned 403 if ANY internal note existed (bug)
    const noteConditions = canViewAll
      ? eq(requestNotes.requestId, id)
      : and(eq(requestNotes.requestId, id), eq(requestNotes.isInternal, false));

    const notes = await db
      .select({
        id: requestNotes.id,
        requestId: requestNotes.requestId,
        content: requestNotes.content,
        isInternal: requestNotes.isInternal,
        createdAt: requestNotes.createdAt,
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(requestNotes)
      .leftJoin(users, eq(requestNotes.userId, users.id))
      .where(noteConditions)
      .orderBy(desc(requestNotes.createdAt));

    return apiSuccess(notes);
  }
);

/** @deprecated Use `trpc.maintenance.createNote` instead */
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
    const { content, isInternal } = body;

    if (!content) {
      return apiError('VALIDATION_ERROR', 'Content is required', 400);
    }

    const note = await db
      .insert(requestNotes)
      .values({
        id: createId(),
        requestId: id,
        userId: authData.userId,
        content,
        isInternal: isInternal !== false,
      })
      .returning();

    revalidateDashboard();

    return apiCreated(note[0]);
  }
);
