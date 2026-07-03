import {
  privilegedProcedure,
  db,
  questions,
  revalidateAdminChanges,
  TRPCError,
  eq,
  and,
  isNull,
  sql,
  inArray,
  AddQuestionInput,
  UpdateQuestionInput,
  RemoveQuestionInput,
  ReorderQuestionsInput,
  requireContentPermission,
  getTenantSurvey,
} from './shared';
import { notDeleted, toEnvelope } from '@api/server';
import { questionDto } from '@api/shared';
import { createId } from '@shared/lib/id';

export const surveyQuestionProcedures = {
  addQuestion: privilegedProcedure
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
          id: createId(),
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
      return toEnvelope(questionDto.parse(created));
    }),

  updateQuestion: privilegedProcedure
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

      const [existing] = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.id, input.questionId),
            eq(questions.surveyId, input.surveyId),
            eq(questions.tenantId, tenantId),
            notDeleted(questions)
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
      return toEnvelope(questionDto.parse(updated));
    }),

  removeQuestion: privilegedProcedure
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

      const [deleted] = await db
        .update(questions)
        .set({ deletedAt: new Date() })
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
      return toEnvelope({ success: true });
    }),

  reorderQuestions: privilegedProcedure
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
      return toEnvelope({ reordered });
    }),
};
