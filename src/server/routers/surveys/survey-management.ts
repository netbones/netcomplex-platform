import {
  tenantProcedure,
  privilegedProcedure,
  rateLimitMiddleware,
  db,
  surveys,
  questions,
  responses,
  surveySections,
  revalidateAdminChanges,
  now,
  TRPCError,
  eq,
  and,
  desc,
  asc,
  sql,
  isNull,
  count,
  IdInput,
  ListSurveysInput,
  CreateSurveyInput,
  UpdateSurveyInput,
  SubmitResponseInput,
  GetSurveyResultsInput,
  requireContentPermission,
  getTenantSurvey,
} from './shared';
import { toEnvelope } from '@api/server';
import { surveyDto, responseDto } from '@server/dto';

export const surveyManagementProcedures = {
  /**
   * List surveys in the current tenant.
   * @tenant
   */
  listSurveys: tenantProcedure
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

      const conditions = [eq(surveys.tenantId, tenantId), isNull(surveys.deletedAt)];

      if (input?.status) {
        conditions.push(eq(surveys.status, input.status));
      }

      const rows = await db
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

      return toEnvelope(rows.map(r => surveyDto.parse(r)));
    }),

  /**
   * Get a single survey in the current tenant.
   * @tenant
   */
  getSurvey: tenantProcedure
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

      return toEnvelope({ survey: surveyDto.parse(survey), questions: surveyQuestions, sections });
    }),

  /**
   * Create a new survey. Requires elevated permissions.
   * @privileged
   */
  createSurvey: privilegedProcedure
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

      return toEnvelope(surveyDto.parse(created));
    }),

  /**
   * Update a survey. Requires elevated permissions.
   * @privileged
   */
  updateSurvey: privilegedProcedure
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
      return toEnvelope(surveyDto.parse(updated));
    }),

  /**
   * Soft-delete a survey. Requires elevated permissions.
   * @privileged
   */
  deleteSurvey: privilegedProcedure
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

      await getTenantSurvey(input.id, tenantId);

      const ts = now();
      await db
        .update(surveys)
        .set({ deletedAt: ts, updatedAt: ts })
        .where(and(eq(surveys.id, input.id), eq(surveys.tenantId, tenantId)));

      revalidateAdminChanges();
      return toEnvelope({ success: true });
    }),

  /**
   * Submit a response to a survey. Rate-limited to 10/min.
   * @tenant
   */
  submitResponse: tenantProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 10 }))
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
            eq(responses.userId, ctx.userId),
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
          userId: ctx.userId,
          answers: input.answers,
          createdAt: now(),
        })
        .returning();

      return toEnvelope(responseDto.parse(response));
    }),

  /**
   * Get aggregated survey results.
   * @tenant
   */
  getSurveyResults: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/surveys/{id}/results',
        tags: ['Surveys'],
        summary: 'Get aggregated survey results',
        protect: true,
      },
    })
    .input(GetSurveyResultsInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const surveyData = await getTenantSurvey(input.id, tenantId);

      const surveyQuestions = await db
        .select()
        .from(questions)
        .where(and(eq(questions.surveyId, input.id), isNull(questions.deletedAt)))
        .orderBy(asc(questions.order));

      const [countResult] = await db
        .select({ count: count() })
        .from(responses)
        .where(and(eq(responses.surveyId, input.id), isNull(responses.deletedAt)));

      const totalResponses = Number(countResult?.count ?? 0);

      const surveyResponses = await db
        .select()
        .from(responses)
        .where(and(eq(responses.surveyId, input.id), isNull(responses.deletedAt)))
        .limit(input.maxResponses)
        .offset(input.offset);

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

      return toEnvelope({
        survey: {
          id: surveyData.id,
          title: surveyData.title,
          status: surveyData.status,
          type: surveyData.type,
        },
        totalResponses,
        questions: aggregatedQuestions,
      });
    }),
};
