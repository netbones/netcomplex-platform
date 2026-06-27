import { z } from 'zod';
import {
  router,
  protectedProcedure,
  db,
  surveys,
  questions,
  responses,
  surveySections,
  revalidateAdminChanges,
  now,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and, desc, asc, sql, isNull, inArray } from 'drizzle-orm';

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

const IdInput = z.object({ id: z.string() });

const ListSurveysInput = z
  .object({
    status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
  })
  .optional();

const CreateSurveyInput = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['INTERNAL', 'EXTERNAL']).optional().default('INTERNAL'),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional().default('DRAFT'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

const UpdateSurveyInput = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['INTERNAL', 'EXTERNAL']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

const SubmitResponseInput = z.object({
  surveyId: z.string(),
  answers: z.record(z.unknown()),
});

const QuestionTypeEnum = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TEXT',
  'RATING',
  'YES_NO',
  'LINEAR_SCALE',
]);

const AddQuestionInput = z.object({
  surveyId: z.string(),
  sectionId: z.string().optional().nullable(),
  text: z.string().min(1),
  type: QuestionTypeEnum,
  options: z.array(z.string()).optional(),
  required: z.boolean().optional().default(false),
  order: z.number().int().optional(),
  config: z.record(z.unknown()).optional(),
});

const UpdateQuestionInput = z.object({
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

const RemoveQuestionInput = z.object({
  surveyId: z.string(),
  questionId: z.string(),
});

const ReorderQuestionsInput = z.object({
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

const AddSectionInput = z.object({
  surveyId: z.string(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

const UpdateSectionInput = z.object({
  surveyId: z.string(),
  sectionId: z.string(),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
});

const RemoveSectionInput = z.object({
  surveyId: z.string(),
  sectionId: z.string(),
});

const ReorderSectionsInput = z.object({
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

function requireContentPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'content')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

async function getTenantSurvey(surveyId: string, tenantId: string) {
  const [survey] = await db
    .select()
    .from(surveys)
    .where(
      and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId), isNull(surveys.deletedAt))
    );
  if (!survey) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Survey not found' });
  }
  return survey;
}

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const surveysRouter = router({
  // ────────── SURVEYS ──────────

  listSurveys: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/surveys',
        tags: ['Surveys'],
        summary: 'List surveys with optional status filter',
        protect: true,
      },
    })
    .input(ListSurveysInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conditions = [eq(surveys.tenantId, tenantId), isNull(surveys.deletedAt)];

      if (input?.status) {
        conditions.push(eq(surveys.status, input.status));
      }

      return db
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
          questionCount: sql<number>`(SELECT COUNT(*) FROM ${questions} WHERE ${eq(questions.surveyId, surveys.id)} AND ${isNull(questions.deletedAt)})`,
          responseCount: sql<number>`(SELECT COUNT(*) FROM ${responses} WHERE ${eq(responses.surveyId, surveys.id)} AND ${isNull(responses.deletedAt)})`,
        })
        .from(surveys)
        .where(and(...conditions))
        .orderBy(desc(surveys.createdAt));
    }),

  getSurvey: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/surveys/{id}',
        tags: ['Surveys'],
        summary: 'Get a single survey with questions and sections',
        protect: true,
      },
    })
    .input(IdInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const survey = await getTenantSurvey(input.id, tenantId);

      const sections = await db
        .select()
        .from(surveySections)
        .where(and(eq(surveySections.surveyId, input.id), isNull(surveySections.deletedAt)))
        .orderBy(asc(surveySections.order));

      const surveyQuestions = await db
        .select()
        .from(questions)
        .where(and(eq(questions.surveyId, input.id), isNull(questions.deletedAt)))
        .orderBy(asc(questions.sectionId), asc(questions.order));

      return { survey, questions: surveyQuestions, sections };
    }),

  createSurvey: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/surveys',
        tags: ['Surveys'],
        summary: 'Create a new survey',
        protect: true,
      },
    })
    .input(CreateSurveyInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const ts = now();
      const [created] = await db
        .insert(surveys)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          title: input.title,
          description: input.description ?? null,
          type: input.type,
          status: input.status,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          config: input.config ?? {},
          createdAt: ts,
          updatedAt: ts,
        })
        .returning();

      revalidateAdminChanges();

      return created;
    }),

  updateSurvey: protectedProcedure
    .meta({
      openapi: {
        method: 'PUT',
        path: '/surveys/{id}',
        tags: ['Surveys'],
        summary: 'Update a survey',
        protect: true,
      },
    })
    .input(UpdateSurveyInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      await getTenantSurvey(input.id, tenantId);

      const updateData: Record<string, unknown> = {
        updatedAt: now(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.config !== undefined) updateData.config = input.config;
      if (input.startDate !== undefined) {
        updateData.startDate = input.startDate ? new Date(input.startDate) : null;
      }
      if (input.endDate !== undefined) {
        updateData.endDate = input.endDate ? new Date(input.endDate) : null;
      }

      const [updated] = await db
        .update(surveys)
        .set(updateData)
        .where(and(eq(surveys.id, input.id), eq(surveys.tenantId, tenantId)))
        .returning();

      revalidateAdminChanges();
      return updated;
    }),

  deleteSurvey: protectedProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/surveys/{id}',
        tags: ['Surveys'],
        summary: 'Soft-delete a survey',
        protect: true,
      },
    })
    .input(IdInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      await getTenantSurvey(input.id, tenantId);

      const ts = now();
      await db
        .update(surveys)
        .set({ deletedAt: ts, updatedAt: ts })
        .where(and(eq(surveys.id, input.id), eq(surveys.tenantId, tenantId)));

      revalidateAdminChanges();
      return { success: true };
    }),

  // ────────── RESPONSES ──────────

  submitResponse: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/surveys/{surveyId}/responses',
        tags: ['Surveys'],
        summary: 'Submit survey responses',
        protect: true,
      },
    })
    .input(SubmitResponseInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [survey] = await db
        .select({ id: surveys.id, status: surveys.status })
        .from(surveys)
        .where(
          and(
            eq(surveys.id, input.surveyId),
            eq(surveys.tenantId, tenantId),
            isNull(surveys.deletedAt)
          )
        )
        .limit(1);

      if (!survey) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Survey not found' });
      }

      if (survey.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Survey is not active',
        });
      }

      const [existing] = await db
        .select({ id: responses.id })
        .from(responses)
        .where(
          and(
            eq(responses.surveyId, input.surveyId),
            eq(responses.userId, ctx.userId!),
            isNull(responses.deletedAt)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You have already responded to this survey',
        });
      }

      const [response] = await db
        .insert(responses)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          surveyId: input.surveyId,
          userId: ctx.userId!,
          answers: input.answers,
          createdAt: now(),
        })
        .returning();

      return response;
    }),

  getSurveyResults: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/surveys/{id}/results',
        tags: ['Surveys'],
        summary: 'Get aggregated survey results',
        protect: true,
      },
    })
    .input(IdInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const surveyData = await getTenantSurvey(input.id, tenantId);

      const surveyQuestions = await db
        .select()
        .from(questions)
        .where(and(eq(questions.surveyId, input.id), isNull(questions.deletedAt)))
        .orderBy(asc(questions.order));

      const surveyResponses = await db
        .select()
        .from(responses)
        .where(and(eq(responses.surveyId, input.id), isNull(responses.deletedAt)));

      const totalResponses = surveyResponses.length;

      const aggregatedQuestions = surveyQuestions.map(question => {
        const questionResponses = surveyResponses.map(r => r.answers as Record<string, unknown>);

        const base = {
          id: question.id,
          text: question.text,
          type: question.type,
          options: question.options,
          responses: {
            total: 0,
            distribution: {} as Record<string, number>,
          },
        };

        if (question.type === 'TEXT') {
          const textResponses: string[] = [];
          for (const answers of questionResponses) {
            const answer = answers[question.id];
            if (typeof answer === 'string' && answer.trim()) {
              textResponses.push(answer.trim());
            }
          }
          return {
            ...base,
            responses: {
              total: textResponses.length,
              texts: textResponses.slice(0, 50),
            },
          };
        }

        if (question.type === 'RATING') {
          const ratingDistribution: Record<string, number> = {
            '1': 0,
            '2': 0,
            '3': 0,
            '4': 0,
            '5': 0,
          };
          let totalRating = 0;
          let ratingCount = 0;

          for (const answers of questionResponses) {
            const rating = answers[question.id];
            if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
              ratingDistribution[String(rating)] = (ratingDistribution[String(rating)] || 0) + 1;
              totalRating += rating;
              ratingCount++;
            }
          }

          return {
            ...base,
            responses: {
              total: ratingCount,
              distribution: ratingDistribution,
              average: ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0,
            },
          };
        }

        const distribution: Record<string, number> = {};
        for (const answers of questionResponses) {
          const answer = answers[question.id];
          if (Array.isArray(answer)) {
            for (const val of answer) {
              distribution[String(val)] = (distribution[String(val)] || 0) + 1;
            }
          } else if (answer !== null && answer !== undefined) {
            distribution[String(answer)] = (distribution[String(answer)] || 0) + 1;
          }
        }

        return {
          ...base,
          responses: {
            total: Object.values(distribution).reduce((sum, count) => sum + count, 0),
            distribution,
          },
        };
      });

      return {
        survey: {
          id: surveyData.id,
          title: surveyData.title,
          status: surveyData.status,
          type: surveyData.type,
        },
        totalResponses,
        questions: aggregatedQuestions,
      };
    }),

  // ────────── QUESTIONS ──────────

  addQuestion: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/surveys/{surveyId}/questions',
        tags: ['Surveys'],
        summary: 'Add a question to a survey',
        protect: true,
      },
    })
    .input(AddQuestionInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      await getTenantSurvey(input.surveyId, tenantId);

      const options =
        input.options ??
        (input.type === 'SINGLE_CHOICE' || input.type === 'MULTIPLE_CHOICE' ? ['Option 1'] : []);

      let order = input.order;
      if (order === undefined) {
        const [maxResult] = await db
          .select({
            maxOrder: sql<number>`COALESCE(MAX(${questions.order}), -1)`,
          })
          .from(questions)
          .where(eq(questions.surveyId, input.surveyId));
        order = (maxResult?.maxOrder ?? -1) + 1;
      }

      const [created] = await db
        .insert(questions)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          surveyId: input.surveyId,
          sectionId: input.sectionId ?? null,
          text: input.text,
          type: input.type,
          options,
          required: input.required,
          order,
          config: input.config ?? {},
        })
        .returning();

      revalidateAdminChanges();
      return created;
    }),

  updateQuestion: protectedProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/surveys/{surveyId}/questions/{questionId}',
        tags: ['Surveys'],
        summary: 'Update a question',
        protect: true,
      },
    })
    .input(UpdateQuestionInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [existing] = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.id, input.questionId),
            eq(questions.surveyId, input.surveyId),
            eq(questions.tenantId, tenantId),
            isNull(questions.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' });
      }

      const updateData: Record<string, unknown> = {};
      if (input.text !== undefined) updateData.text = input.text;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.options !== undefined) updateData.options = input.options;
      if (input.required !== undefined) updateData.required = input.required;
      if (input.order !== undefined) updateData.order = input.order;
      if (input.sectionId !== undefined) updateData.sectionId = input.sectionId;
      if (input.config !== undefined) updateData.config = input.config;

      const [updated] = await db
        .update(questions)
        .set(updateData)
        .where(
          and(
            eq(questions.id, input.questionId),
            eq(questions.surveyId, input.surveyId),
            eq(questions.tenantId, tenantId)
          )
        )
        .returning();

      revalidateAdminChanges();
      return updated;
    }),

  removeQuestion: protectedProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/surveys/{surveyId}/questions/{questionId}',
        tags: ['Surveys'],
        summary: 'Remove a question',
        protect: true,
      },
    })
    .input(RemoveQuestionInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [deleted] = await db
        .delete(questions)
        .where(
          and(
            eq(questions.id, input.questionId),
            eq(questions.surveyId, input.surveyId),
            eq(questions.tenantId, tenantId)
          )
        )
        .returning({ id: questions.id });

      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' });
      }

      revalidateAdminChanges();
      return { success: true };
    }),

  reorderQuestions: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/surveys/{surveyId}/questions/reorder',
        tags: ['Surveys'],
        summary: 'Reorder questions in a survey',
        protect: true,
      },
    })
    .input(ReorderQuestionsInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      await getTenantSurvey(input.surveyId, tenantId);

      const itemIds = input.items.map(item => item.id);

      const existing = await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(
            eq(questions.surveyId, input.surveyId),
            eq(questions.tenantId, tenantId),
            inArray(questions.id, itemIds)
          )
        );

      if (existing.length !== itemIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more questions not found in this survey',
        });
      }

      const reordered = await db.transaction(async tx => {
        for (const item of input.items) {
          const updateSet: Record<string, unknown> = { order: item.order };
          if ('sectionId' in item) {
            updateSet.sectionId = item.sectionId ?? null;
          }
          await tx
            .update(questions)
            .set(updateSet)
            .where(and(eq(questions.id, item.id), eq(questions.tenantId, tenantId)));
        }
        return input.items.length;
      });

      revalidateAdminChanges();
      return { reordered };
    }),

  // ────────── SECTIONS ──────────

  addSection: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/surveys/{surveyId}/sections',
        tags: ['Surveys'],
        summary: 'Add a section to a survey',
        protect: true,
      },
    })
    .input(AddSectionInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      await getTenantSurvey(input.surveyId, tenantId);

      let order = input.order;
      if (order === undefined) {
        const [maxResult] = await db
          .select({
            maxOrder: sql<number>`COALESCE(MAX(${surveySections.order}), -1)`,
          })
          .from(surveySections)
          .where(eq(surveySections.surveyId, input.surveyId));
        order = (maxResult?.maxOrder ?? -1) + 1;
      }

      const ts = now();
      const [created] = await db
        .insert(surveySections)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          surveyId: input.surveyId,
          title: input.title ?? null,
          description: input.description ?? null,
          image: input.image ?? null,
          order,
          createdAt: ts,
          updatedAt: ts,
        })
        .returning();

      revalidateAdminChanges();
      return created;
    }),

  updateSection: protectedProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/surveys/{surveyId}/sections/{sectionId}',
        tags: ['Surveys'],
        summary: 'Update a section',
        protect: true,
      },
    })
    .input(UpdateSectionInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [existing] = await db
        .select()
        .from(surveySections)
        .where(
          and(
            eq(surveySections.id, input.sectionId),
            eq(surveySections.surveyId, input.surveyId),
            eq(surveySections.tenantId, tenantId),
            isNull(surveySections.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Section not found' });
      }

      const updateData: Record<string, unknown> = { updatedAt: now() };
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.image !== undefined) updateData.image = input.image;

      const [updated] = await db
        .update(surveySections)
        .set(updateData)
        .where(
          and(
            eq(surveySections.id, input.sectionId),
            eq(surveySections.surveyId, input.surveyId),
            eq(surveySections.tenantId, tenantId)
          )
        )
        .returning();

      revalidateAdminChanges();
      return updated;
    }),

  removeSection: protectedProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/surveys/{surveyId}/sections/{sectionId}',
        tags: ['Surveys'],
        summary: 'Remove a section',
        protect: true,
      },
    })
    .input(RemoveSectionInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [deleted] = await db
        .delete(surveySections)
        .where(
          and(
            eq(surveySections.id, input.sectionId),
            eq(surveySections.surveyId, input.surveyId),
            eq(surveySections.tenantId, tenantId)
          )
        )
        .returning({ id: surveySections.id });

      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Section not found' });
      }

      revalidateAdminChanges();
      return { success: true };
    }),

  reorderSections: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/surveys/{surveyId}/sections/reorder',
        tags: ['Surveys'],
        summary: 'Reorder sections in a survey',
        protect: true,
      },
    })
    .input(ReorderSectionsInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      await getTenantSurvey(input.surveyId, tenantId);

      const itemIds = input.items.map(item => item.id);

      const existing = await db
        .select({ id: surveySections.id })
        .from(surveySections)
        .where(
          and(
            eq(surveySections.surveyId, input.surveyId),
            eq(surveySections.tenantId, tenantId),
            inArray(surveySections.id, itemIds)
          )
        );

      if (existing.length !== itemIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more sections not found in this survey',
        });
      }

      const reordered = await db.transaction(async tx => {
        for (const item of input.items) {
          await tx
            .update(surveySections)
            .set({ order: item.order, updatedAt: now() })
            .where(and(eq(surveySections.id, item.id), eq(surveySections.tenantId, tenantId)));
        }
        return input.items.length;
      });

      revalidateAdminChanges();
      return { reordered };
    }),
});
