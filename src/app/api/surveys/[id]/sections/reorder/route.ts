import {
  auth,
  db,
  surveySections,
  surveys,
  users,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  now,
  withErrorHandler,
  getSessionAndRole,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and, inArray } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;
/**
 * POST /api/surveys/[id]/sections/reorder - Batch update order for sections.
 * Body: { items: [{ id: string, order: number }] }
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const authData = await getSessionAndRole(request);

    if (!authData) {
      return apiUnauthorized();
    }

    if (!hasPermission(authData.role, 'content')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();
    const { id: surveyId } = await params;

    // Verify survey exists in tenant
    const [survey] = await db
      .select({ id: surveys.id })
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)))
      .limit(1);

    if (!survey) {
      return apiNotFound('Survey not found');
    }

    const body = await request.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return apiValidationError({ items: 'items must be a non-empty array' });
    }

    for (const item of body.items) {
      if (!item.id || typeof item.id !== 'string') {
        return apiValidationError({ items: 'each item must have a string id' });
      }
      if (typeof item.order !== 'number') {
        return apiValidationError({ items: 'each item must have a numeric order' });
      }
    }

    const itemIds = body.items.map((item: { id: string }) => item.id);

    // Verify all section IDs belong to this survey + tenant
    const existing = await db
      .select({ id: surveySections.id })
      .from(surveySections)
      .where(
        and(
          eq(surveySections.surveyId, surveyId),
          eq(surveySections.tenantId, tenantId),
          inArray(surveySections.id, itemIds)
        )
      );

    if (existing.length !== itemIds.length) {
      return apiNotFound('One or more sections not found in this survey');
    }

    // Batch update in a transaction
    const reordered = await db.transaction(async tx => {
      for (const item of body.items) {
        await tx
          .update(surveySections)
          .set({ order: item.order, updatedAt: now() })
          .where(and(eq(surveySections.id, item.id), eq(surveySections.tenantId, tenantId)));
      }
      return body.items.length;
    });

    return apiSuccess({ reordered });
  }
);
