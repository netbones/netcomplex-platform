import { z } from 'zod';
import {
  publicProcedure,
  db,
  externalSurveys,
  responses,
  now,
  TRPCError,
  eq,
  and,
  desc,
} from './shared';
import { toEnvelope } from '@api/server';
import { externalSurveyDto, responseDto } from '@api/server';
import { createId } from '@shared/lib/id';

export const externalSurveyProcedures = {
  /** @classification PUBLIC — unauthenticated external survey listing */
  listExternalSurveys: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/surveys/external', tags: ['Surveys'] } })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });

      const result = await db
        .select()
        .from(externalSurveys)
        .where(and(eq(externalSurveys.tenantId, tenantId), eq(externalSurveys.isActive, true)))
        .orderBy(desc(externalSurveys.createdAt));

      return toEnvelope(result.map(r => externalSurveyDto.parse(r)));
    }),

  /** @classification PUBLIC — unauthenticated external survey response submission */
  submitExternalSurveyResponse: publicProcedure
    .meta({ openapi: { method: 'POST', path: '/surveys/external/respond', tags: ['Surveys'] } })
    .input(
      z.object({
        surveyId: z.string(),
        answers: z
          .record(z.unknown())
          .refine(val => Object.keys(val).length <= 200, 'Too many answers')
          .refine(val => JSON.stringify(val).length <= 50000, 'Answer payload too large'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });

      const survey = await db
        .select()
        .from(externalSurveys)
        .where(and(eq(externalSurveys.id, input.surveyId), eq(externalSurveys.tenantId, tenantId)))
        .limit(1);

      if (!survey.length)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'External survey not found' });

      const [response] = await db
        .insert(responses)
        .values({
          id: createId(),
          tenantId,
          surveyId: input.surveyId,
          userId: ctx.userId ?? undefined,
          answers: input.answers,
          createdAt: now(),
        })
        .returning();

      return toEnvelope(responseDto.parse(response));
    }),
};
