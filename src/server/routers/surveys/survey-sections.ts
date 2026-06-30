import {
  privilegedProcedure,
  db,
  surveySections,
  revalidateAdminChanges,
  now,
  TRPCError,
  eq,
  and,
  isNull,
  sql,
  inArray,
  AddSectionInput,
  UpdateSectionInput,
  RemoveSectionInput,
  ReorderSectionsInput,
  requireContentPermission,
  getTenantSurvey,
} from './shared';
import { toEnvelope } from '@api/server';
import { createId } from '@shared/lib/id';

export const surveySectionProcedures = {
  addSection: privilegedProcedure
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
          id: createId(),
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
      return toEnvelope(created);
    }),

  updateSection: privilegedProcedure
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
      return toEnvelope(updated);
    }),

  removeSection: privilegedProcedure
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

      const [deleted] = await db
        .update(surveySections)
        .set({ deletedAt: new Date() })
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
      return toEnvelope({ success: true });
    }),

  reorderSections: privilegedProcedure
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
      return toEnvelope({ reordered });
    }),
};
