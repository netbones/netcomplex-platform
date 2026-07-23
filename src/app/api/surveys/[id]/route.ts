import {
  db,
  surveys,
  questions,
  surveySections,
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  now,
  withErrorHandler,
  getSessionAndRole,
  guardSuspension,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and, asc } from 'drizzle-orm';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';

export const maxDuration = 8;
/**
 * GET /api/surveys/[id] - Fetch a single survey with nested questions and sections.
 * @deprecated Use `trpc.surveys.getSurvey` instead
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const authData = await getSessionAndRole(request);

    if (!authData) {
      return apiUnauthorized();
    }
    const guard = guardSuspension(authData);
    if (guard) return guard;
    const featureCheck = await assertModuleEnabled('surveys');
    if (featureCheck) return featureCheck;

    const { tenantId } = await withTenant();
    const { id: surveyId } = await params;

    const [survey] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)))
      .limit(1);

    if (!survey) {
      return apiNotFound('Survey not found');
    }

    // Fetch all sections for this survey, ordered by order
    const sections = await db
      .select()
      .from(surveySections)
      .where(eq(surveySections.surveyId, surveyId))
      .orderBy(asc(surveySections.order));

    // Fetch all questions for this survey, ordered by sectionId then order
    const surveyQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.surveyId, surveyId))
      .orderBy(asc(questions.sectionId), asc(questions.order));

    return apiSuccess({ survey, questions: surveyQuestions, sections });
  }
);

/**
 * PUT /api/surveys/[id] - Update survey fields (title, description, status, config).
 * Accepts partial body — only updates fields that are present.
 * @deprecated Use `trpc.surveys.updateSurvey` instead
 */
export const PUT = withErrorHandler(
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
    const [existing] = await db
      .select({ id: surveys.id })
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return apiNotFound('Survey not found');
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updatedAt: now(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.config !== undefined) updateData.config = body.config;
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }

    const [updated] = await db
      .update(surveys)
      .set(updateData)
      .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return apiError('INTERNAL_ERROR', 'Failed to update survey', 500);
    }

    return apiSuccess(updated);
  }
);
