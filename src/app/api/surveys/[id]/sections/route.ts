import {
  auth,
  db,
  surveySections,
  questions,
  surveys,
  users,
  apiCreated,
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

import { eq, and, asc, sql, inArray } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;
/**
 * GET /api/surveys/[id]/sections - List all sections for a survey, ordered by order.
 * Each section includes its nested questions ordered by order.
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
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

    const sections = await db
      .select()
      .from(surveySections)
      .where(eq(surveySections.surveyId, surveyId))
      .orderBy(asc(surveySections.order));

    // Fetch all questions for this survey (filtered to those with sectionId)
    const sectionIds = sections.map(s => s.id);
    const sectionQuestions =
      sectionIds.length > 0
        ? await db
            .select()
            .from(questions)
            .where(and(eq(questions.surveyId, surveyId), inArray(questions.sectionId, sectionIds)))
            .orderBy(asc(questions.order))
        : [];

    // Nest questions into their parent sections
    const sectionsWithQuestions = sections.map(section => ({
      ...section,
      questions: sectionQuestions.filter(q => q.sectionId === section.id),
    }));

    return apiSuccess(sectionsWithQuestions);
  }
);

/**
 * POST /api/surveys/[id]/sections - Create a new section.
 * Auto-assigns order = max(existing order) + 1 when not provided.
 * @deprecated Use `trpc.surveys.addSection` instead
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

    // Auto-assign order when not provided
    let order = body.order;
    if (order === undefined || order === null) {
      const [maxResult] = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${surveySections.order}), -1)` })
        .from(surveySections)
        .where(eq(surveySections.surveyId, surveyId));
      order = (maxResult?.maxOrder ?? -1) + 1;
    }

    const ts = now();
    const [created] = await db
      .insert(surveySections)
      .values({
        id: createId(),
        tenantId,
        surveyId,
        title: body.title ?? null,
        description: body.description ?? null,
        image: body.image ?? null,
        order,
        createdAt: ts,
        updatedAt: ts,
      })
      .returning();

    return apiCreated(created);
  }
);
