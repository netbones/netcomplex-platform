import { toEnvelope } from '@api/server';
import {
  z,
  tenantProcedure,
  privilegedProcedure,
  db,
  maintenanceCategories,
  TRPCError,
  eq,
  and,
  asc,
  isNull,
  CategoryInput,
  UpdateCategoryInput,
  requireRequestsPermission,
} from './shared';
import { createId } from '@shared/lib/id';

export const maintenanceCategoryProcedures = {
  /**
   * List maintenance categories in the current tenant.
   * @tenant
   */
  listCategories: tenantProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const conditions = [
        eq(maintenanceCategories.tenantId, tenantId),
        isNull(maintenanceCategories.deletedAt),
      ];

      if (input?.isActive !== undefined) {
        conditions.push(eq(maintenanceCategories.isActive, input.isActive));
      }

      return toEnvelope(
        await db
          .select()
          .from(maintenanceCategories)
          .where(and(...conditions))
          .orderBy(asc(maintenanceCategories.label))
      );
    }),

  /**
   * Create a maintenance category. Requires elevated permissions.
   * @privileged
   */
  createCategory: privilegedProcedure.input(CategoryInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;

    // Check for duplicate value
    const [existing] = await db
      .select()
      .from(maintenanceCategories)
      .where(
        and(
          eq(maintenanceCategories.tenantId, tenantId),
          eq(maintenanceCategories.value, input.value),
          isNull(maintenanceCategories.deletedAt)
        )
      );

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Category value already exists' });
    }

    const [created] = await db
      .insert(maintenanceCategories)
      .values({
        id: createId(),
        tenantId,
        value: input.value,
        label: input.label,
        description: input.description || null,
        isActive: true,
        createdAt: new Date(),
      })
      .returning();

    return toEnvelope(created);
  }),

  /**
   * Update a maintenance category. Requires elevated permissions.
   * @privileged
   */
  updateCategory: privilegedProcedure
    .input(UpdateCategoryInput)
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const [existing] = await db
        .select()
        .from(maintenanceCategories)
        .where(
          and(
            eq(maintenanceCategories.id, input.id),
            eq(maintenanceCategories.tenantId, tenantId),
            isNull(maintenanceCategories.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
      }

      const updateData: Record<string, unknown> = {};
      if (input.label !== undefined) updateData.label = input.label;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const [updated] = await db
        .update(maintenanceCategories)
        .set(updateData)
        .where(
          and(eq(maintenanceCategories.id, input.id), eq(maintenanceCategories.tenantId, tenantId))
        )
        .returning();

      return toEnvelope(updated);
    }),

  /**
   * Soft-delete a maintenance category. Requires elevated permissions.
   * @privileged
   */
  deleteCategory: privilegedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const [existing] = await db
        .select()
        .from(maintenanceCategories)
        .where(
          and(
            eq(maintenanceCategories.id, input.id),
            eq(maintenanceCategories.tenantId, tenantId),
            isNull(maintenanceCategories.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
      }

      await db
        .update(maintenanceCategories)
        .set({ deletedAt: new Date() })
        .where(
          and(eq(maintenanceCategories.id, input.id), eq(maintenanceCategories.tenantId, tenantId))
        );

      return toEnvelope({ success: true });
    }),
};
