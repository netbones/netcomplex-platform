import { z } from 'zod';
import {
  db,
  externalSurveys,
  notDeleted,
  now,
  privilegedProcedure,
  protectedProcedure,
  publicProcedure,
  questions,
  rateLimitMiddleware,
  responses,
  revalidateAdminChanges,
  router,
  surveySections,
  surveys,
  tenantProcedure,
} from '@api/server';
import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import { eq, and, desc, asc, sql, isNull, inArray, count } from 'drizzle-orm';

export {
  z,
  router,
  publicProcedure,
  protectedProcedure,
  privilegedProcedure,
  tenantProcedure,
  rateLimitMiddleware,
  db,
  surveys,
  questions,
  responses,
  surveySections,
  externalSurveys,
  revalidateAdminChanges,
  now,
  TRPCError,
  hasPermission,
  eq,
  and,
  desc,
  asc,
  sql,
  isNull,
  inArray,
  count,
};

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

export const IdInput = z.object({ id: z.string() });

export const ListSurveysInput = z
  .object({
    status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
  })
  .optional();

export const CreateSurveyInput = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['INTERNAL', 'EXTERNAL']).optional().default('INTERNAL'),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional().default('DRAFT'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

export const UpdateSurveyInput = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['INTERNAL', 'EXTERNAL']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

export const SubmitResponseInput = z.object({
  surveyId: z.string(),
  answers: z.record(z.unknown()).refine(val => Object.keys(val).length <= 500, 'Too many answers'),
});

export const GetSurveyResultsInput = z.object({
  id: z.string(),
  maxResponses: z.coerce.number().min(1).max(5000).default(500),
  offset: z.coerce.number().min(0).default(0),
});

export const QuestionTypeEnum = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TEXT',
  'RATING',
  'YES_NO',
  'LINEAR_SCALE',
]);

export const AddQuestionInput = z.object({
  surveyId: z.string(),
  sectionId: z.string().optional().nullable(),
  text: z.string().min(1),
  type: QuestionTypeEnum,
  options: z.array(z.string()).optional(),
  required: z.boolean().optional().default(false),
  order: z.number().int().optional(),
  config: z.record(z.unknown()).optional(),
});

export const UpdateQuestionInput = z.object({
  surveyId: z.string(),
  questionId: z.string(),
  text: z.string().optional(),
  type: QuestionTypeEnum.optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  order: z.number().int().optional(),
  sectionId: z.string().optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

export const RemoveQuestionInput = z.object({
  surveyId: z.string(),
  questionId: z.string(),
});

export const ReorderQuestionsInput = z.object({
  surveyId: z.string(),
  items: z
    .array(
      z.object({
        id: z.string(),
        order: z.number().int(),
        sectionId: z.string().optional().nullable(),
      })
    )
    .min(1),
});

export const AddSectionInput = z.object({
  surveyId: z.string(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

export const UpdateSectionInput = z.object({
  surveyId: z.string(),
  sectionId: z.string(),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
});

export const RemoveSectionInput = z.object({
  surveyId: z.string(),
  sectionId: z.string(),
});

export const ReorderSectionsInput = z.object({
  surveyId: z.string(),
  items: z
    .array(
      z.object({
        id: z.string(),
        order: z.number().int(),
      })
    )
    .min(1),
});

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

export function requireContentPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'content')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

export async function getTenantSurvey(surveyId: string, tenantId: string) {
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId), notDeleted(surveys)));
  if (!survey) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Survey not found' });
  }
  return survey;
}
