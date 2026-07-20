import {
  auth,
  db,
  surveySections,
  users,
  apiError,
  apiForbidden,
  apiNoContent,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  now,
  withErrorHandler,
  getSessionAndRole,
  guardSuspension,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;
/**
 * PATCH /api/surveys/[id]/sections/[sectionId] - Update section fields.
 * Accepts partial body: title, description, image.
 * @deprecated Use `trpc.surveys.updateSection` instead
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string; sectionId: string }> }) => {
    const authData = await getSessionAndRole(request);

    if (!authData) {
      return apiUnauthorized();
    }
    const guard = guardSuspension(authData);
    if (guard) return guard;

    if (!hasPermission(authData.role, 'content')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();
    const { id: surveyId, sectionId } = await params;

    // Verify section exists and belongs to this survey + tenant
    const [existing] = await db
      .select()
      .from(surveySections)
      .where(
        and(
          eq(surveySections.id, sectionId),
          eq(surveySections.surveyId, surveyId),
          eq(surveySections.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      return apiNotFound('Section not found');
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updatedAt: now(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.image !== undefined) updateData.image = body.image;

    const [updated] = await db
      .update(surveySections)
      .set(updateData)
      .where(
        and(
          eq(surveySections.id, sectionId),
          eq(surveySections.surveyId, surveyId),
          eq(surveySections.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      return apiError('INTERNAL_ERROR', 'Failed to update section', 500);
    }

    return apiSuccess(updated);
  }
);

/**
 * DELETE /api/surveys/[id]/sections/[sectionId] - Delete a section.
 * Questions that reference this section have their sectionId nullified via the
 * Question.sectionId SetNull cascade defined in the Prisma schema.
 * @deprecated Use `trpc.surveys.removeSection` instead
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string; sectionId: string }> }) => {
    const authData = await getSessionAndRole(request);

    if (!authData) {
      return apiUnauthorized();
    }

    if (!hasPermission(authData.role, 'content')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();
    const { id: surveyId, sectionId } = await params;

    const [deleted] = await db
      .update(surveySections)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(
        and(
          eq(surveySections.id, sectionId),
          eq(surveySections.surveyId, surveyId),
          eq(surveySections.tenantId, tenantId)
        )
      )
      .returning({ id: surveySections.id });

    if (!deleted) {
      return apiNotFound('Section not found');
    }

    return apiNoContent();
  }
);
