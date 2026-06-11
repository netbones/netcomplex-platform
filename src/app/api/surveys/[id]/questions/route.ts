import {
  auth,
  db,
  questions,
  surveys,
  users,
  apiCreated,
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
} from '@api/server';

import { hasPermission } from '@entities/tenant';

import { eq, and, asc, sql, inArray } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';

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
 * GET /api/surveys/[id]/questions - List all questions for a survey.
 * Ordered by sectionId (nulls first) then order.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const surveyQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(asc(questions.sectionId), asc(questions.order));

  return apiSuccess(surveyQuestions);
}

/**
 * POST /api/surveys/[id]/questions - Create a new question.
 * Auto-assigns order = max(existing order) + 1 when not provided.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // Validate required fields
  if (!body.text || typeof body.text !== 'string') {
    return apiValidationError({ text: 'text is required and must be a string' });
  }

  if (!body.type || !VALID_QUESTION_TYPES.includes(body.type)) {
    return apiValidationError({
      type: `type must be one of: ${VALID_QUESTION_TYPES.join(', ')}`,
    });
  }

  const questionType = body.type as QuestionType;

  // Default options for choice types when not provided
  let options: string[] = body.options;
  if (options === undefined || options === null) {
    if (questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') {
      options = ['Option 1'];
    } else {
      options = [];
    }
  } else if (!Array.isArray(options)) {
    return apiValidationError({ options: 'options must be an array of strings' });
  }

  // Auto-assign order when not provided
  let order = body.order;
  if (order === undefined || order === null) {
    const [maxResult] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${questions.order}), -1)` })
      .from(questions)
      .where(eq(questions.surveyId, surveyId));
    order = (maxResult?.maxOrder ?? -1) + 1;
  }

  const [created] = await db
    .insert(questions)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      surveyId,
      sectionId: body.sectionId ?? null,
      text: body.text,
      type: questionType,
      options,
      required: body.required ?? false,
      order,
      config: body.config ?? {},
    })
    .returning();

  return apiCreated(created);
}
