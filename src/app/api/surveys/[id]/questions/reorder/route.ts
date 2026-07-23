import {
  db,
  questions,
  surveys,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  withErrorHandler,
  now,
  getSessionAndRole,
  guardSuspension,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and, inArray } from 'drizzle-orm';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';

export const maxDuration = 8;
/**
 * POST /api/surveys/[id]/questions/reorder - Batch update order/sectionId for questions.
 * Body: { items: [{ id: string, order: number, sectionId?: string | null }] }
 * @deprecated Use `trpc.surveys.reorderQuestions` instead
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const authData = await getSessionAndRole(request);

    if (!authData) {
      return apiUnauthorized();
    }
    const guard = guardSuspension(authData);
    if (guard) return guard;
    const featureCheck = await assertModuleEnabled('surveys');
    if (featureCheck) return featureCheck;

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

    // Validate each item shape
    for (const item of body.items) {
      if (!item.id || typeof item.id !== 'string') {
        return apiValidationError({ items: 'each item must have a string id' });
      }
      if (typeof item.order !== 'number') {
        return apiValidationError({ items: 'each item must have a numeric order' });
      }
    }

    const itemIds = body.items.map((item: { id: string }) => item.id);

    // Verify all question IDs belong to this survey + tenant
    const existing = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        and(
          eq(questions.surveyId, surveyId),
          eq(questions.tenantId, tenantId),
          inArray(questions.id, itemIds)
        )
      );

    if (existing.length !== itemIds.length) {
      return apiNotFound('One or more questions not found in this survey');
    }

    // Batch update in a transaction
    const reordered = await db.transaction(async tx => {
      for (const item of body.items) {
        const updateSet: Record<string, unknown> = { order: item.order, updatedAt: now() };
        // Allow moving questions between sections (or to ungrouped)
        if ('sectionId' in item) {
          updateSet.sectionId = item.sectionId ?? null;
        }
        await tx
          .update(questions)
          .set(updateSet)
          .where(and(eq(questions.id, item.id), eq(questions.tenantId, tenantId)));
      }
      return body.items.length;
    });

    return apiSuccess({ reordered });
  }
);
