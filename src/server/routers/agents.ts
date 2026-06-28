import { z } from 'zod';
import {
  router,
  protectedProcedure,
  agentProcedure,
  db,
  agentAccesses,
  agentProfiles,
  users,
  properties,
  premiumSeats,
} from '@api/server';

import { TRPCError } from '@trpc/server';

import { eq, and, desc, isNull } from 'drizzle-orm';

export const agentsRouter = router({
  getActivity: agentProcedure
    .meta({ openapi: { method: 'GET', path: '/agents/activity', protect: true, tags: ['agents'] } })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const accessRecords = await db
        .select({ agentId: agentAccesses.agentId })
        .from(agentAccesses)
        .where(and(eq(agentAccesses.grantedById, ctx.userId), eq(agentAccesses.tenantId, tenantId)))
        .limit(1);

      if (accessRecords.length === 0) {
        return { activities: [] };
      }

      return { activities: [] };
    }),

  listManagedProperties: agentProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/agents/managed-properties',
        protect: true,
        tags: ['agents'],
      },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const results = await db
        .select({
          agentAccess: agentAccesses,
          property: properties,
          grantedBy: users,
        })
        .from(agentAccesses)
        .leftJoin(properties, eq(agentAccesses.propertyId, properties.id))
        .leftJoin(users, eq(agentAccesses.grantedById, users.id))
        .where(
          and(
            eq(agentAccesses.agentId, ctx.userId),
            eq(agentAccesses.tenantId, tenantId),
            eq(agentAccesses.status, 'ACTIVE'),
            isNull(agentAccesses.deletedAt)
          )
        )
        .orderBy(desc(agentAccesses.createdAt));

      const managedProperties = results.map(row => ({
        id: row.property?.id ?? '',
        street: row.property?.street ?? '',
        unit: row.property?.unit ?? '',
        platformAddress: row.property?.platformAddress ?? '',
        homeImage: row.property?.homeImage ?? null,
        accessExpiresAt: row.agentAccess.expiresAt?.toISOString() ?? null,
        accessLevel: row.agentAccess.accessLevel,
        grantedBy: {
          id: row.grantedBy?.id ?? '',
          name: row.grantedBy?.name ?? 'Unknown',
        },
        grantedAt: row.agentAccess.createdAt.toISOString(),
      }));

      return { properties: managedProperties };
    }),

  getMarketplaceActions: protectedProcedure
    .meta({
      openapi: { method: 'GET', path: '/agents/marketplace', protect: true, tags: ['agents'] },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const agentList = await db
        .select({
          id: agentProfiles.id,
          agencyName: agentProfiles.agencyName,
          licenseNumber: agentProfiles.licenseNumber,
          experienceYears: agentProfiles.experienceYears,
          specializations: agentProfiles.specializations,
          serviceAreas: agentProfiles.serviceAreas,
          totalListings: agentProfiles.totalListings,
          activeListings: agentProfiles.activeListings,
          salesCompleted: agentProfiles.salesCompleted,
          rating: agentProfiles.rating,
          reviewCount: agentProfiles.reviewCount,
          isVerified: agentProfiles.isVerified,
          verificationDate: agentProfiles.verificationDate,
          agent: {
            id: users.id,
            name: users.name,
          },
        })
        .from(agentProfiles)
        .leftJoin(users, eq(agentProfiles.agentId, users.id))
        .where(
          and(
            eq(agentProfiles.isVerified, true),
            eq(agentProfiles.tenantId, tenantId),
            isNull(agentProfiles.deletedAt)
          )
        )
        .orderBy(desc(agentProfiles.rating), desc(agentProfiles.reviewCount))
        .limit(20);

      return { agents: agentList };
    }),

  connectWithAgent: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .meta({ openapi: { method: 'POST', path: '/agents/connect', protect: true, tags: ['agents'] } })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [seat] = await db
        .select()
        .from(premiumSeats)
        .where(and(eq(premiumSeats.userId, ctx.userId), eq(premiumSeats.tenantId, tenantId)))
        .limit(1);

      if (!seat) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Premium Seat required to connect with agents',
        });
      }

      const [agent] = await db
        .select({ id: agentProfiles.id, agencyName: agentProfiles.agencyName })
        .from(agentProfiles)
        .where(
          and(
            eq(agentProfiles.id, input.agentId),
            eq(agentProfiles.tenantId, tenantId),
            eq(agentProfiles.isVerified, true)
          )
        )
        .limit(1);

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found or not verified' });
      }

      return {
        success: true,
        message: 'Connection request sent successfully',
        agentId: input.agentId,
      };
    }),
});
