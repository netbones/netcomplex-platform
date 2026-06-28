import { toEnvelope } from '@api/server';
import {
  z,
  protectedProcedure,
  db,
  serviceProviders,
  TRPCError,
  hasPermission,
  eq,
  and,
  asc,
  isNull,
  ProviderInput,
  UpdateProviderInput,
  requireRequestsPermission,
} from './shared';

export const maintenanceProviderProcedures = {
  listProviders: protectedProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conditions = [
        eq(serviceProviders.tenantId, tenantId),
        isNull(serviceProviders.deletedAt),
      ];

      if (input?.isActive !== undefined) {
        conditions.push(eq(serviceProviders.isActive, input.isActive));
      }

      return toEnvelope(
        await db
          .select()
          .from(serviceProviders)
          .where(and(...conditions))
          .orderBy(asc(serviceProviders.companyName))
      );
    }),

  createProvider: protectedProcedure.input(ProviderInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [created] = await db
      .insert(serviceProviders)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        companyName: input.companyName,
        trade: input.trade,
        contactName: input.contactName || null,
        phone: input.phone || null,
        email: input.email || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return toEnvelope(created);
  }),

  updateProvider: protectedProcedure.input(UpdateProviderInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [existing] = await db
      .select()
      .from(serviceProviders)
      .where(
        and(
          eq(serviceProviders.id, input.id),
          eq(serviceProviders.tenantId, tenantId),
          isNull(serviceProviders.deletedAt)
        )
      );

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.companyName !== undefined) updateData.companyName = input.companyName;
    if (input.trade !== undefined) updateData.trade = input.trade;
    if (input.contactName !== undefined) updateData.contactName = input.contactName;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(serviceProviders)
      .set(updateData)
      .where(and(eq(serviceProviders.id, input.id), eq(serviceProviders.tenantId, tenantId)))
      .returning();

    return toEnvelope(updated);
  }),

  deleteProvider: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [existing] = await db
        .select()
        .from(serviceProviders)
        .where(
          and(
            eq(serviceProviders.id, input.id),
            eq(serviceProviders.tenantId, tenantId),
            isNull(serviceProviders.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
      }

      await db
        .update(serviceProviders)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(serviceProviders.id, input.id), eq(serviceProviders.tenantId, tenantId)));

      return toEnvelope({ success: true });
    }),
};
