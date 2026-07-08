import { notDeleted, toEnvelope } from '@api/server';
import {
  z,
  tenantProcedure,
  privilegedProcedure,
  db,
  maintenanceTeams,
  TRPCError,
  eq,
  and,
  asc,
  TeamInput,
  UpdateTeamInput,
  requireRequestsPermission,
} from './shared';
import { createId } from '@shared/lib/id';

export const maintenanceTeamProcedures = {
  /**
   * List maintenance teams in the current tenant.
   * @tenant
   */
  listTeams: tenantProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const conditions = [eq(maintenanceTeams.tenantId, tenantId), notDeleted(maintenanceTeams)];

      if (input?.isActive !== undefined) {
        conditions.push(eq(maintenanceTeams.isActive, input.isActive));
      }

      return toEnvelope(
        await db
          .select()
          .from(maintenanceTeams)
          .where(and(...conditions))
          .orderBy(asc(maintenanceTeams.name))
      );
    }),

  /**
   * Create a maintenance team. Requires elevated permissions.
   * @privileged
   */
  createTeam: privilegedProcedure.input(TeamInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;

    const [created] = await db
      .insert(maintenanceTeams)
      .values({
        id: createId(),
        tenantId,
        name: input.name,
        trade: input.trade,
        contactName: input.contactName || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return toEnvelope(created);
  }),

  /**
   * Update a maintenance team. Requires elevated permissions.
   * @privileged
   */
  updateTeam: privilegedProcedure.input(UpdateTeamInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;

    const [existing] = await db
      .select()
      .from(maintenanceTeams)
      .where(
        and(
          eq(maintenanceTeams.id, input.id),
          eq(maintenanceTeams.tenantId, tenantId),
          notDeleted(maintenanceTeams)
        )
      );

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.trade !== undefined) updateData.trade = input.trade;
    if (input.contactName !== undefined) updateData.contactName = input.contactName;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(maintenanceTeams)
      .set(updateData)
      .where(and(eq(maintenanceTeams.id, input.id), eq(maintenanceTeams.tenantId, tenantId)))
      .returning();

    return toEnvelope(updated);
  }),

  /**
   * Soft-delete a maintenance team. Requires elevated permissions.
   * @privileged
   */
  deleteTeam: privilegedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const [existing] = await db
        .select()
        .from(maintenanceTeams)
        .where(
          and(
            eq(maintenanceTeams.id, input.id),
            eq(maintenanceTeams.tenantId, tenantId),
            notDeleted(maintenanceTeams)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      await db
        .update(maintenanceTeams)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(maintenanceTeams.id, input.id), eq(maintenanceTeams.tenantId, tenantId)));

      return toEnvelope({ success: true });
    }),
};
