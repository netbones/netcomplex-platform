import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';

export const identityRouter = router({
  // ============ HOUSEHOLDS ============

  /**
   * Get all households (admin only)
   * For public directory, use publicGetHousehold
   */
  listHouseholds: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          street: z.string().optional(),
          status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const { search, street, status, page, limit } = input || {};
      const skip = ((page || 1) - 1) * (limit || 20);

      const where: any = {};
      if (search) {
        where.OR = [
          { unit: { contains: search, mode: 'insensitive' } },
          { street: { contains: search, mode: 'insensitive' } },
          { platformAddress: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (street) where.street = street;
      if (status) where.status = status;

      const [households, total] = await Promise.all([
        ctx.prisma.household.findMany({
          where,
          include: {
            standardSeats: { include: { user: { select: { id: true, name: true, email: true } } } },
            profiles: true,
          },
          skip,
          take: limit || 20,
          orderBy: { unit: 'asc' },
        }),
        ctx.prisma.household.count({ where }),
      ]);

      return { households, total, page: page || 1, limit: limit || 20 };
    }),

  /**
   * Get household by ID with all related data
   */
  getHousehold: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const household = await ctx.prisma.household.findUnique({
        where: { id: input.id },
        include: {
          standardSeats: {
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
          },
          profiles: {
            where: { status: { not: 'REMOVED' } },
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
          },
          premiumSeats: {
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
          },
        },
      });

      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      // Check if user has access (owner, agent, or admin)
      const isOwner = household.standardSeats.some(s => s.userId === ctx.userId);
      const isAgent = await ctx.prisma.agentAccess.findFirst({
        where: {
          agentId: ctx.userId,
          householdId: input.id,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (!isOwner && !isAgent && ctx.role !== 'ADMIN' && ctx.role !== 'BOARD') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      return household;
    }),

  /**
   * Get household by unit number (public - limited data)
   */
  getHouseholdByUnit: publicProcedure
    .input(z.object({ unit: z.string(), street: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const household = await ctx.prisma.household.findFirst({
        where: { unit: input.unit },
        select: {
          id: true,
          street: true,
          unit: true,
          platformAddress: true,
          homeImage: true,
          status: true,
        },
      });

      if (!household || household.status !== 'ACTIVE') {
        return null;
      }

      return household;
    }),

  /**
   * Create new household (admin only)
   */
  createHousehold: adminProcedure
    .input(
      z.object({
        street: z.string().min(1),
        unit: z.string().min(1),
        platformAddress: z.string().email(),
        homeImage: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check for duplicate
      const existing = await ctx.prisma.household.findUnique({
        where: { street_unit: { street: input.street, unit: input.unit } },
      });
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Household already exists' });
      }

      return ctx.prisma.household.create({
        data: input,
      });
    }),

  /**
   * Update household
   */
  updateHousehold: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        homeImage: z.string().optional(),
        status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
        moveInDate: z.date().optional(),
        moveOutDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      // Check ownership
      const household = await ctx.prisma.household.findUnique({
        where: { id },
        include: { standardSeats: true },
      });

      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      const isOwner = household.standardSeats.some(
        s => s.userId === ctx.userId && s.isPrimaryOwner
      );
      const isAdmin = ctx.role === 'ADMIN' || ctx.role === 'BOARD';

      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only primary owner can update household',
        });
      }

      return ctx.prisma.household.update({
        where: { id },
        data,
      });
    }),

  // ============ STANDARD SEATS (Property Owners) ============

  /**
   * Create Standard Seat (property owner link)
   */
  createStandardSeat: protectedProcedure
    .input(
      z.object({
        householdId: z.string(),
        isPrimaryOwner: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if household exists
      const household = await ctx.prisma.household.findUnique({
        where: { id: input.householdId },
        include: { standardSeats: true },
      });

      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      // Check if already has a seat
      const existingSeat = await ctx.prisma.standardSeat.findUnique({
        where: { userId_householdId: { userId: ctx.userId, householdId: input.householdId } },
      });
      if (existingSeat) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already linked to this household' });
      }

      // Generate platform address: name.unitNNN@soralia.org
      const user = await ctx.prisma.user.findUnique({ where: { id: ctx.userId } });
      const platformAddress = `${user?.name.toLowerCase().replace(/\s+/g, '.')}.${household.unit}@soralia.org`;

      return ctx.prisma.standardSeat.create({
        data: {
          userId: ctx.userId,
          householdId: input.householdId,
          isPrimaryOwner: input.isPrimaryOwner && household.standardSeats.length === 0,
          platformAddress,
        },
      });
    }),

  /**
   * Get my households (as property owner)
   */
  getMyHouseholds: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.standardSeat.findMany({
      where: { userId: ctx.userId },
      include: {
        household: {
          include: {
            profiles: { where: { status: 'ACTIVE' } },
            standardSeats: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }),

  // ============ PROFILES (Occupants/Family/Minors) ============

  /**
   * Add profile to household (owner or agent)
   */
  createProfile: protectedProcedure
    .input(
      z.object({
        householdId: z.string(),
        displayName: z.string().min(1),
        occupantType: z.enum(['OCCUPANT', 'FAMILY', 'MINOR']).default('OCCUPANT'),
        leaseStartDate: z.date().optional(),
        leaseEndDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { householdId, displayName, occupantType, leaseStartDate, leaseEndDate } = input;

      // Check access
      const household = await ctx.prisma.household.findUnique({
        where: { id: householdId },
        include: { standardSeats: true, profiles: true },
      });

      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      const isOwner = household.standardSeats.some(s => s.userId === ctx.userId);
      const isAgent = await ctx.prisma.agentAccess.findFirst({
        where: { agentId: ctx.userId, householdId, isActive: true, expiresAt: { gt: new Date() } },
      });

      if (!isOwner && !isAgent && ctx.role !== 'ADMIN' && ctx.role !== 'BOARD') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot add profiles to this household',
        });
      }

      // Check profile limit (max 5)
      if (household.profiles.filter(p => p.status === 'ACTIVE').length >= 5) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum 5 profiles per household' });
      }

      // Generate profile address: name.unitNNN@soralia.org
      const profileAddress = `${displayName.toLowerCase().replace(/\s+/g, '.')}.${household.unit}@soralia.org`;

      return ctx.prisma.profile.create({
        data: {
          householdId,
          displayName,
          profileAddress,
          occupantType,
          occupantSince: new Date(),
          leaseStartDate,
          leaseEndDate,
        },
      });
    }),

  /**
   * Update profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        displayName: z.string().min(1).optional(),
        avatar: z.string().optional(),
        isPublic: z.boolean().optional(),
        showEmail: z.boolean().optional(),
        showPhone: z.boolean().optional(),
        leaseEndDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const profile = await ctx.prisma.profile.findUnique({
        where: { id },
        include: { household: { include: { standardSeats: true } } },
      });

      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });
      }

      // Check access: profile owner, household owner, or agent
      const isProfileOwner = profile.userId === ctx.userId;
      const isHouseholdOwner = profile.household.standardSeats.some(s => s.userId === ctx.userId);
      const isAgent = await ctx.prisma.agentAccess.findFirst({
        where: {
          agentId: ctx.userId,
          householdId: profile.householdId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (!isProfileOwner && !isHouseholdOwner && !isAgent && ctx.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update this profile' });
      }

      return ctx.prisma.profile.update({
        where: { id },
        data,
      });
    }),

  /**
   * Remove profile (eviction or move-out)
   */
  removeProfile: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.enum(['MOVE_OUT', 'EVICTED', 'LEASE_ENDED']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const profile = await ctx.prisma.profile.findUnique({
        where: { id: input.id },
        include: { household: { include: { standardSeats: true } } },
      });

      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });
      }

      // Check access
      const isHouseholdOwner = profile.household.standardSeats.some(s => s.userId === ctx.userId);
      const isAgent = await ctx.prisma.agentAccess.findFirst({
        where: {
          agentId: ctx.userId,
          householdId: profile.householdId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (!isHouseholdOwner && !isAgent && ctx.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot remove this profile' });
      }

      const status = input.reason === 'EVICTED' ? 'EVICTED' : 'REMOVED';

      return ctx.prisma.profile.update({
        where: { id: input.id },
        data: { status },
      });
    }),

  /**
   * Get profile by ID
   */
  getProfile: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const profile = await ctx.prisma.profile.findUnique({
      where: { id: input.id },
      include: {
        household: { select: { id: true, street: true, unit: true, homeImage: true } },
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    if (!profile || profile.status === 'REMOVED') {
      return null;
    }

    return profile;
  }),

  /**
   * Upgrade profile to Premium Seat
   */
  upgradeToPremium: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        seatType: z.enum(['RESIDENT', 'MEMBER']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const profile = await ctx.prisma.profile.findUnique({
        where: { id: input.profileId },
      });

      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });
      }

      // Check tenure (1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (profile.occupantSince > oneYearAgo) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must be occupant for 1 year before upgrade',
        });
      }

      if (profile.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Profile must be active to upgrade' });
      }

      // Check if already has premium seat
      const existingSeat = await ctx.prisma.premiumSeat.findUnique({
        where: { userId: ctx.userId },
      });
      if (existingSeat) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already has a Premium Seat' });
      }

      // Create premium seat
      const user = await ctx.prisma.user.findUnique({ where: { id: ctx.userId } });
      const platformAddress = `${user?.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`;

      return ctx.prisma.$transaction([
        ctx.prisma.profile.update({
          where: { id: input.profileId },
          data: { status: 'UPGRADED' },
        }),
        ctx.prisma.premiumSeat.create({
          data: {
            userId: ctx.userId,
            platformAddress,
            seatType: input.seatType,
            householdId: profile.householdId,
            linkedFromProfileId: profile.id,
          },
        }),
      ]);
    }),

  // ============ PREMIUM SEATS ============

  /**
   * Get my premium seat (if any)
   */
  getMyPremiumSeat: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.premiumSeat.findUnique({
      where: { userId: ctx.userId },
      include: {
        household: { select: { id: true, street: true, unit: true, homeImage: true } },
      },
    });
  }),

  /**
   * Get premium seat by ID (public)
   */
  getPremiumSeat: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const seat = await ctx.prisma.premiumSeat.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              interests: true,
              isPublic: true,
              showEmail: true,
              showPhone: true,
            },
          },
          household: { select: { id: true, street: true, unit: true, homeImage: true } },
        },
      });

      return seat;
    }),

  /**
   * Resolve legacy user ID to new identity model
   * Used for /resident/[id] backward compatibility
   */
  resolveUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      // First check PremiumSeat
      const premiumSeat = await ctx.prisma.premiumSeat.findFirst({
        where: { userId: input.userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              interests: true,
              isPublic: true,
              showEmail: true,
              showPhone: true,
            },
          },
          household: { select: { id: true, street: true, unit: true, homeImage: true } },
        },
      });

      if (premiumSeat) {
        return { type: 'premiumSeat', data: premiumSeat };
      }

      // Then check Profile
      const profile = await ctx.prisma.profile.findFirst({
        where: { userId: input.userId, status: 'ACTIVE' },
        include: {
          household: { select: { id: true, street: true, unit: true, homeImage: true } },
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      });

      if (profile) {
        return { type: 'profile', data: profile };
      }

      // Finally check StandardSeat (property owner - redirect to household)
      const standardSeat = await ctx.prisma.standardSeat.findFirst({
        where: { userId: input.userId },
        include: {
          household: {
            include: {
              standardSeats: {
                include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
              },
              profiles: { where: { status: 'ACTIVE' } },
            },
          },
        },
      });

      if (standardSeat) {
        return { type: 'standardSeat', data: standardSeat };
      }

      return null;
    }),

  // ============ AGENT ACCESS ============

  /**
   * Request agent access to household
   */
  requestAgentAccess: protectedProcedure
    .input(
      z.object({
        householdId: z.string(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only agents can request
      if (ctx.role !== 'AGENT') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only agents can request access' });
      }

      // Check household exists
      const household = await ctx.prisma.household.findUnique({
        where: { id: input.householdId },
      });
      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      // Check for existing pending/active request
      const existing = await ctx.prisma.agentAccess.findFirst({
        where: {
          agentId: ctx.userId,
          householdId: input.householdId,
          isActive: true,
        },
      });
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Access already exists' });
      }

      // For now, auto-approve (or could create a pending request for owner approval)
      return ctx.prisma.agentAccess.create({
        data: {
          agentId: ctx.userId,
          householdId: input.householdId,
          grantedById: ctx.userId, // Self-granted for demo
          reason: input.reason,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    }),

  /**
   * Grant agent access to household (owner only)
   */
  grantAgentAccess: protectedProcedure
    .input(
      z.object({
        agentUserId: z.string(),
        householdId: z.string(),
        expiresAt: z.date(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const household = await ctx.prisma.household.findUnique({
        where: { id: input.householdId },
        include: { standardSeats: true },
      });

      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      const isOwner = household.standardSeats.some(
        s => s.userId === ctx.userId && s.isPrimaryOwner
      );
      if (!isOwner && ctx.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only primary owner can grant access' });
      }

      return ctx.prisma.agentAccess.create({
        data: {
          agentId: input.agentUserId,
          householdId: input.householdId,
          grantedById: ctx.userId,
          expiresAt: input.expiresAt,
          reason: input.reason,
        },
      });
    }),

  /**
   * Revoke agent access
   */
  revokeAgentAccess: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const access = await ctx.prisma.agentAccess.findUnique({
        where: { id: input.id },
      });

      if (!access) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Access not found' });
      }

      // Only owner or admin can revoke
      const isOwner = access.grantedById === ctx.userId;
      if (!isOwner && ctx.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot revoke this access' });
      }

      return ctx.prisma.agentAccess.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  /**
   * Get agent's active accesses
   */
  getMyAgentAccesses: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.agentAccess.findMany({
      where: {
        agentId: ctx.userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        household: { select: { id: true, street: true, unit: true } },
      },
    });
  }),

  /**
   * Get households I manage as agent
   */
  getMyManagedHouseholds: protectedProcedure.query(async ({ ctx }) => {
    const accesses = await ctx.prisma.agentAccess.findMany({
      where: {
        agentId: ctx.userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        household: {
          include: {
            standardSeats: { include: { user: { select: { id: true, name: true } } } },
            profiles: { where: { status: 'ACTIVE' } },
          },
        },
        grantedBy: { select: { id: true, name: true } },
      },
    });

    return accesses.map(a => ({
      ...a.household,
      accessExpiresAt: a.expiresAt,
      grantedBy: a.grantedBy,
    }));
  }),
});
