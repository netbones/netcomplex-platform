import { z } from 'zod';
import {
  publicProcedure,
  privilegedProcedure,
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

  adminListExternalSurveys: privilegedProcedure
    .meta({
      openapi: { method: 'GET', path: '/admin/external-surveys', protect: true, tags: ['Surveys'] },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });

      const result = await db
        .select()
        .from(externalSurveys)
        .where(eq(externalSurveys.tenantId, tenantId))
        .orderBy(desc(externalSurveys.createdAt));

      return toEnvelope(result.map(r => externalSurveyDto.parse(r)));
    }),

  createExternalSurvey: privilegedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/admin/external-surveys',
        protect: true,
        tags: ['Surveys'],
      },
    })
    .input(
      z.object({
        name: z.string(),
        provider: z.string(),
        externalId: z.string(),
        embedUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });

      const ts = now();
      const [survey] = await db
        .insert(externalSurveys)
        .values({
          id: createId(),
          tenantId,
          name: input.name,
          provider: input.provider,
          externalId: input.externalId,
          embedUrl: input.embedUrl ?? '',
          isActive: true,
          createdAt: ts,
          updatedAt: ts,
        })
        .returning();

      return toEnvelope(externalSurveyDto.parse(survey));
    }),

  updateExternalSurvey: privilegedProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/admin/external-surveys/{id}',
        protect: true,
        tags: ['Surveys'],
      },
    })
    .input(
      z.object({ id: z.string(), name: z.string().optional(), isActive: z.boolean().optional() })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });

      const updateData: Record<string, unknown> = { updatedAt: now() };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const [survey] = await db
        .update(externalSurveys)
        .set(updateData)
        .where(and(eq(externalSurveys.id, input.id), eq(externalSurveys.tenantId, tenantId)))
        .returning();

      return toEnvelope(externalSurveyDto.parse(survey));
    }),

  deleteExternalSurvey: privilegedProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/admin/external-surveys/{id}',
        protect: true,
        tags: ['Surveys'],
      },
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });

      const ts = now();
      await db
        .update(externalSurveys)
        .set({ deletedAt: ts, updatedAt: ts })
        .where(and(eq(externalSurveys.id, input.id), eq(externalSurveys.tenantId, tenantId)));

      return toEnvelope({ success: true });
    }),
};
