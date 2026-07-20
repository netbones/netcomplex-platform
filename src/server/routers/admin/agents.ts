import { z } from 'zod';
import { adminProcedure, db, router, toEnvelope } from '@api/server';
import { agentProfiles } from '@schema/agent-profiles';
import { users } from '@schema/users';
import { eq, and, desc, isNull } from 'drizzle-orm';

export const adminAgentsRouter = router({
  /**
   * List all verified agents with full profile data including commission rate.
   * Admin-only — includes sensitive fields not exposed via marketplace.
   */
  listAgents: adminProcedure
    .input(
      z
        .object({
          tenantId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const conditions = [isNull(agentProfiles.deletedAt)];
      if (input?.tenantId) {
        conditions.push(eq(agentProfiles.tenantId, input.tenantId));
      }

      const agents = await db
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
          avgSalePrice: agentProfiles.avgSalePrice,
          rating: agentProfiles.rating,
          reviewCount: agentProfiles.reviewCount,
          commissionRate: agentProfiles.commissionRate,
          responseTime: agentProfiles.responseTime,
          isVerified: agentProfiles.isVerified,
          verificationDate: agentProfiles.verificationDate,
          tenantId: agentProfiles.tenantId,
          agentId: agentProfiles.agentId,
          agentName: users.name,
          agentEmail: users.email,
        })
        .from(agentProfiles)
        .leftJoin(users, eq(agentProfiles.agentId, users.id))
        .where(and(...conditions))
        .orderBy(desc(agentProfiles.rating))
        .limit(100);

      return toEnvelope({ agents });
    }),
});
