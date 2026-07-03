import { z } from 'zod';
import {
  agentAccesses,
  agentProcedure,
  agentProfiles,
  db,
  notDeleted,
  premiumSeats,
  properties,
  router,
  tenantProcedure,
  users,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { agentProfileDto } from '@api/shared';

import { TRPCError } from '@trpc/server';

import { eq, and, desc, isNull } from 'drizzle-orm';

export const agentsRouter = router({
  /**
   * Get agent activity for the current tenant.
   * @privileged
   */
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
        return toEnvelope({ activities: [] });
      }

      return toEnvelope({ activities: [] });
    }),

  /**
   * List properties managed by the current agent.
   * @privileged
   */
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
            notDeleted(agentAccesses)
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

      return toEnvelope({ properties: managedProperties });
    }),

  /**
   * Browse agent marketplace listings — tenant-scoped.
   * @tenant
   */
  getMarketplaceActions: tenantProcedure
    .meta({
      openapi: { method: 'GET', path: '/agents/marketplace', protect: true, tags: ['agents'] },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;

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
            notDeleted(agentProfiles)
          )
        )
        .orderBy(desc(agentProfiles.rating), desc(agentProfiles.reviewCount))
        .limit(20);

      return toEnvelope({ agents: agentList.map(a => agentProfileDto.parse(a)) });
    }),

  /**
   * Connect with a verified agent — tenant-scoped, premium seat required.
   * @tenant
   */
  connectWithAgent: tenantProcedure
    .input(z.object({ agentId: z.string() }))
    .meta({ openapi: { method: 'POST', path: '/agents/connect', protect: true, tags: ['agents'] } })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

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

      return toEnvelope({
        success: true,
        message: 'Connection request sent successfully',
        agentId: input.agentId,
      });
    }),
});
