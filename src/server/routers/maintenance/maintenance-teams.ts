import { toEnvelope } from '@api/server';
import {
  z,
  protectedProcedure,
  db,
  maintenanceTeams,
  TRPCError,
  hasPermission,
  eq,
  and,
  asc,
  isNull,
  TeamInput,
  UpdateTeamInput,
  requireRequestsPermission,
} from './shared';

export const maintenanceTeamProcedures = {
  listTeams: protectedProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conditions = [
        eq(maintenanceTeams.tenantId, tenantId),
        isNull(maintenanceTeams.deletedAt),
      ];

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

  createTeam: protectedProcedure.input(TeamInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [created] = await db
      .insert(maintenanceTeams)
      .values({
        id: crypto.randomUUID(),
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

  updateTeam: protectedProcedure.input(UpdateTeamInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [existing] = await db
      .select()
      .from(maintenanceTeams)
      .where(
        and(
          eq(maintenanceTeams.id, input.id),
          eq(maintenanceTeams.tenantId, tenantId),
          isNull(maintenanceTeams.deletedAt)
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

  deleteTeam: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [existing] = await db
        .select()
        .from(maintenanceTeams)
        .where(
          and(
            eq(maintenanceTeams.id, input.id),
            eq(maintenanceTeams.tenantId, tenantId),
            isNull(maintenanceTeams.deletedAt)
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
