import { z } from 'zod/v4';
import {
  db,
  surveys,
  questions,
  responses,
  apiCreated,
  apiForbidden,
  apiSuccess,
  apiValidationError,
  now,
  withErrorHandler,
  rateLimitByUser,
} from '@api/server';

import { requireAuth } from '@/shared/api/auth-utils';
import { hasPermission } from '@shared/lib';

import { eq, and, desc, sql } from 'drizzle-orm';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

const surveyCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  type: z.enum(['INTERNAL', 'EXTERNAL']).optional().default('INTERNAL'),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional().default('DRAFT'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const maxDuration = 8;
/** @deprecated Use `trpc.surveys.listSurveys` instead */
export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;
  const featureCheck = await assertModuleEnabled('surveys');
  if (featureCheck) return featureCheck;

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

/** @deprecated Use `trpc.surveys.createSurvey` instead */
export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (!hasPermission(auth.data.role, 'content')) {
    return apiForbidden();
  }

  const rateLimit = await rateLimitByUser(auth.data.userId, {
    windowMs: 60_000,
    maxRequests: 10,
  });
  if (rateLimit) return rateLimit;

  const body = await request.json();

  const parsed = surveyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { title, description, type, status, startDate, endDate } = parsed.data;
  const ts = now();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [survey] = await db
    .insert(surveys)
    .values({
      id: createId(),
      tenantId,
      title,
      description,
      type,
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();

  return apiCreated(survey);
});
