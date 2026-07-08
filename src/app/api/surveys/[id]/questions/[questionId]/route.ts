import {
  auth,
  db,
  questions,
  users,
  apiError,
  apiForbidden,
  apiNoContent,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  now,
  withErrorHandler,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

const VALID_QUESTION_TYPES = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TEXT',
  'RATING',
  'YES_NO',
  'LINEAR_SCALE',
] as const;

type QuestionType = (typeof VALID_QUESTION_TYPES)[number];

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: user[0]?.role || 'RESIDENT',
  };
}

/**
 * PATCH /api/surveys/[id]/questions/[questionId] - Update question fields.
 * Accepts partial body: text, type, options, required, order, sectionId, config.
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) => {
    const authData = await getSessionAndRole(request);

    if (!authData) {
      return apiUnauthorized();
    }

    if (!hasPermission(authData.role, 'content')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();
    const { id: surveyId, questionId } = await params;

    // Verify question exists and belongs to this survey + tenant
    const [existing] = await db
      .select()
      .from(questions)
      .where(
        and(
          eq(questions.id, questionId),
          eq(questions.surveyId, surveyId),
          eq(questions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      return apiNotFound('Question not found');
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.text !== undefined) {
      if (typeof body.text !== 'string') {
        return apiValidationError({ text: 'text must be a string' });
      }
      updateData.text = body.text;
    }

    if (body.type !== undefined) {
      if (!VALID_QUESTION_TYPES.includes(body.type)) {
        return apiValidationError({
          type: `type must be one of: ${VALID_QUESTION_TYPES.join(', ')}`,
        });
      }
      updateData.type = body.type as QuestionType;
    }

    if (body.options !== undefined) {
      if (!Array.isArray(body.options)) {
        return apiValidationError({ options: 'options must be an array of strings' });
      }
      updateData.options = body.options;
    }

    if (body.required !== undefined) updateData.required = !!body.required;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.sectionId !== undefined) updateData.sectionId = body.sectionId ?? null;
    if (body.config !== undefined) updateData.config = body.config;

    const [updated] = await db
      .update(questions)
      .set(updateData)
      .where(
        and(
          eq(questions.id, questionId),
          eq(questions.surveyId, surveyId),
          eq(questions.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      return apiError('INTERNAL_ERROR', 'Failed to update question', 500);
    }

    return apiSuccess(updated);
  }
);

/**
 * DELETE /api/surveys/[id]/questions/[questionId] - Delete a question.
 * On section delete, the question's sectionId is set to null via SetNull cascade —
 * for explicit deletion, just call DELETE.
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) => {
    const authData = await getSessionAndRole(request);

    if (!authData) {
      return apiUnauthorized();
    }

    if (!hasPermission(authData.role, 'content')) {
      return apiForbidden();
    }

    const { tenantId } = await withTenant();
    const { id: surveyId, questionId } = await params;

    const [deleted] = await db
      .update(questions)
      .set({ deletedAt: now() })
      .where(
        and(
          eq(questions.id, questionId),
          eq(questions.surveyId, surveyId),
          eq(questions.tenantId, tenantId)
        )
      )
      .returning({ id: questions.id });

    if (!deleted) {
      return apiNotFound('Question not found');
    }

    return apiNoContent();
  }
);
