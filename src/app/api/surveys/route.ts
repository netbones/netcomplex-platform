import {
  auth,
  db,
  surveys,
  users,
  questions,
  responses,
  apiCreated,
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  now,
  withErrorHandler,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and, desc, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

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

export const GET = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  const { tenantId } = await withTenant();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const surveyList = status
    ? await db
        .select({
          id: surveys.id,
          tenantId: surveys.tenantId,
          title: surveys.title,
          description: surveys.description,
          type: surveys.type,
          status: surveys.status,
          startDate: surveys.startDate,
          endDate: surveys.endDate,
          createdAt: surveys.createdAt,
          updatedAt: surveys.updatedAt,
          questionCount: sql<number>`(SELECT COUNT(*) FROM ${questions} WHERE ${eq(questions.surveyId, surveys.id)})`,
          responseCount: sql<number>`(SELECT COUNT(*) FROM ${responses} WHERE ${eq(responses.surveyId, surveys.id)})`,
        })
        .from(surveys)
        .where(
          and(
            eq(surveys.tenantId, tenantId),
            eq(surveys.status, status as 'DRAFT' | 'ACTIVE' | 'CLOSED')
          )
        )
        .orderBy(desc(surveys.createdAt))
    : await db
        .select({
          id: surveys.id,
          tenantId: surveys.tenantId,
          title: surveys.title,
          description: surveys.description,
          type: surveys.type,
          status: surveys.status,
          startDate: surveys.startDate,
          endDate: surveys.endDate,
          createdAt: surveys.createdAt,
          updatedAt: surveys.updatedAt,
          questionCount: sql<number>`(SELECT COUNT(*) FROM ${questions} WHERE ${eq(questions.surveyId, surveys.id)})`,
          responseCount: sql<number>`(SELECT COUNT(*) FROM ${responses} WHERE ${eq(responses.surveyId, surveys.id)})`,
        })
        .from(surveys)
        .where(eq(surveys.tenantId, tenantId))
        .orderBy(desc(surveys.createdAt));

  return apiSuccess(surveyList);
});

export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'content')) {
    return apiForbidden();
  }

  const body = await request.json();
  const ts = now();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [survey] = await db
    .insert(surveys)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      title: body.title,
      description: body.description ?? null,
      type: body.type ?? 'INTERNAL',
      status: body.status ?? 'DRAFT',
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();

  return apiCreated(survey);
});
