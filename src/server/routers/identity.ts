import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import { hasPermission } from '@/lib/permissions';
import { db, households, profiles, standardSeats, soloSeats, agentAccesses, users } from '@/lib/db';
import { eq, and, or, desc, asc, gt, ne, like, count } from 'drizzle-orm';

export const identityRouter = router({
  // ============ HOUSEHOLDS ============

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
      const limitVal = limit || 20;

      const conditions = [];
      if (search) {
        conditions.push(
          or(
            like(households.unit, `%${search}%`),
            like(households.street, `%${search}%`),
            like(households.platformAddress, `%${search}%`)
          )
        );
      }
      if (street) conditions.push(eq(households.street, street));
      if (status) conditions.push(eq(households.status, status));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [householdsResult, totalResult] = await Promise.all([
        db
          .select()
          .from(households)
          .where(whereClause)
          .limit(limitVal)
          .offset(skip)
          .orderBy(asc(households.unit)),
        db.select({ total: count() }).from(households).where(whereClause),
      ]);

      const total = totalResult[0]?.total || 0;

      const householdsWithRelations = await Promise.all(
        householdsResult.map(async hh => {
          const [seats, profileData] = await Promise.all([
            db.select().from(standardSeats).where(eq(standardSeats.householdId, hh.id)),
            db.select().from(profiles).where(eq(profiles.householdId, hh.id)),
          ]);
          return {
            ...hh,
            standardSeats: seats,
            profiles: profileData,
          };
        })
      );

      return { households: householdsWithRelations, total, page: page || 1, limit: limitVal };
    }),

  getHousehold: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [household] = await db.select().from(households).where(eq(households.id, input.id));

      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      const [standardSeatsData, profilesData, soloSeatsData] = await Promise.all([
        db.select().from(standardSeats).where(eq(standardSeats.householdId, input.id)),
        db
          .select()
          .from(profiles)
          .where(and(eq(profiles.householdId, input.id), ne(profiles.status, 'REMOVED'))),
        db.select().from(soloSeats).where(eq(soloSeats.householdId, input.id)),
      ]);

      const isOwner = standardSeatsData.some(s => s.userId === ctx.userId);

      const [isAgent] = await db
        .select()
        .from(agentAccesses)
        .where(
          and(
            eq(agentAccesses.agentId, ctx.userId),
            eq(agentAccesses.householdId, input.id),
            eq(agentAccesses.isActive, true),
            gt(agentAccesses.expiresAt, new Date())
          )
        );

      if (!isOwner && !isAgent && !hasPermission(ctx.role, 'households')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      return {
        ...household,
        standardSeats: standardSeatsData,
        profiles: profilesData,
        soloSeats: soloSeatsData,
      };
    }),

  getHouseholdByUnit: publicProcedure
    .input(z.object({ unit: z.string(), street: z.string().optional() }))
    .query(async ({ input }) => {
      const conditions = [eq(households.unit, input.unit)];
      if (input.street) conditions.push(eq(households.street, input.street));

      const [household] = await db
        .select({
          id: households.id,
          street: households.street,
          unit: households.unit,
          platformAddress: households.platformAddress,
          homeImage: households.homeImage,
          status: households.status,
        })
        .from(households)
        .where(and(...conditions));

      if (!household || household.status !== 'ACTIVE') {
        return null;
      }

      return household;
    }),

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
      const [existing] = await db
        .select()
        .from(households)
        .where(and(eq(households.street, input.street), eq(households.unit, input.unit)));

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Household already exists' });
      }

      const now = new Date();
      const [created] = await db
        .insert(households)
        .values({
          id: crypto.randomUUID(),
          tenantId: ctx.tenantId || 'soralia',
          street: input.street,
          unit: input.unit,
          platformAddress: input.platformAddress,
          homeImage: input.homeImage || null,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
          organizationId: ctx.organizationId,
        })
        .returning();

      return created;
    }),

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

      const [household] = await db.select().from(households).where(eq(households.id, id));

      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      const [seats] = await db
        .select()
        .from(standardSeats)
        .where(eq(standardSeats.householdId, id));
      const isOwner = seats?.userId === ctx.userId && seats?.isPrimaryOwner;
      const canAccessHouseholds = hasPermission(ctx.role, 'households');

      if (!isOwner && !canAccessHouseholds) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only primary owner can update household',
        });
      }

      const [updated] = await db
        .update(households)
        .set(data)
        .where(eq(households.id, id))
        .returning();
      return updated;
    }),

  // ============ STANDARD SEATS ============

  createStandardSeat: adminProcedure
    .input(
      z.object({
        householdId: z.string(),
        userId: z.string(),
        isPrimaryOwner: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.householdId));

      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      const [existingSeat] = await db
        .select()
        .from(standardSeats)
        .where(
          and(
            eq(standardSeats.userId, input.userId),
            eq(standardSeats.householdId, input.householdId)
          )
        );

      if (existingSeat) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already linked to this household' });
      }

      const [user] = await db.select().from(users).where(eq(users.id, input.userId));
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const [existingSeats] = await db
        .select()
        .from(standardSeats)
        .where(eq(standardSeats.householdId, input.householdId));
      const isFirstOwner = !existingSeats;

      const platformAddress = `${(user.name || '').toLowerCase().replace(/\s+/g, '.')}.${household.unit}@soralia.org`;

      const [created] = await db
        .insert(standardSeats)
        .values({
          id: crypto.randomUUID(),
          tenantId: ctx.tenantId || 'soralia',
          userId: input.userId,
          householdId: input.householdId,
          isPrimaryOwner: input.isPrimaryOwner && isFirstOwner,
          platformAddress,
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId: ctx.organizationId,
        } as any)
        .returning();

      return created;
    }),

  getMyHouseholds: protectedProcedure.query(async ({ ctx }) => {
    const seats = await db
      .select()
      .from(standardSeats)
      .where(eq(standardSeats.userId, ctx.userId!))
      .orderBy(desc(standardSeats.createdAt));

    // Optimize: Batch fetch all related data to avoid N+1 queries
    const householdIds = [...new Set(seats.map(s => s.householdId))];

    // Fetch all households, profiles, and seats in parallel
    const [allHouseholds, allProfiles, allSeats] = await Promise.all([
      householdIds.length > 0
        ? db
            .select()
            .from(households)
            .where(and(...householdIds.map(id => eq(households.id, id))))
        : Promise.resolve([]),
      householdIds.length > 0
        ? db
            .select()
            .from(profiles)
            .where(
              and(
                eq(profiles.status, 'ACTIVE'),
                ...householdIds.map(id => eq(profiles.householdId, id))
              )
            )
        : Promise.resolve([]),
      householdIds.length > 0
        ? db
            .select()
            .from(standardSeats)
            .where(and(...householdIds.map(id => eq(standardSeats.householdId, id))))
        : Promise.resolve([]),
    ]);

    // Build lookup maps
    const householdMap = new Map(allHouseholds.map(h => [h.id, h]));
    const profilesMap = new Map(allProfiles.map(p => [p.householdId, p]));
    const seatsMap = new Map(allSeats.map(s => [s.householdId, s]));

    // Map relations
    const householdsWithRelations = seats.map(seat => {
      const household = householdMap.get(seat.householdId);
      const profilesData = allProfiles.filter(p => p.householdId === seat.householdId);
      const seatsData = allSeats.filter(s => s.householdId === seat.householdId);
      return {
        ...seat,
        household: household
          ? { ...household, profiles: profilesData, standardSeats: seatsData }
          : null,
      };
    });

    return householdsWithRelations;
  }),

  // ============ PROFILES ============

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

      const [household] = await db.select().from(households).where(eq(households.id, householdId));

      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      const [seats] = await db
        .select()
        .from(standardSeats)
        .where(eq(standardSeats.householdId, householdId));
      const isOwner = seats?.userId === ctx.userId;

      const [agentAccess] = await db
        .select()
        .from(agentAccesses)
        .where(
          and(
            eq(agentAccesses.agentId, ctx.userId!),
            eq(agentAccesses.householdId, householdId),
            eq(agentAccesses.isActive, true),
            gt(agentAccesses.expiresAt, new Date())
          )
        );

      if (!isOwner && !agentAccess && !hasPermission(ctx.role, 'households')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot add profiles to this household',
        });
      }

      const profilesData = await db
        .select()
        .from(profiles)
        .where(and(eq(profiles.householdId, householdId), eq(profiles.status, 'ACTIVE')));
      if (profilesData.length >= 5) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum 5 profiles per household' });
      }

      const profileAddress = `${displayName.toLowerCase().replace(/\s+/g, '.')}.${household.unit}@soralia.org`;

      const [created] = await db
        .insert(profiles)
        .values({
          id: crypto.randomUUID(),
          tenantId: 'soralia',
          householdId,
          displayName,
          profileAddress,
          occupantType,
          occupantSince: new Date(),
          leaseStartDate,
          leaseEndDate,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId: ctx.organizationId,
        } as any)
        .returning();

      return created;
    }),

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

      const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));

      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });
      }

      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, profile.householdId));
      const [seats] = await db
        .select()
        .from(standardSeats)
        .where(eq(standardSeats.householdId, household?.id));

      const isProfileOwner = profile.userId === ctx.userId;
      const isHouseholdOwner = seats?.userId === ctx.userId;

      const [agentAccess] = await db
        .select()
        .from(agentAccesses)
        .where(
          and(
            eq(agentAccesses.agentId, ctx.userId!),
            eq(agentAccesses.householdId, profile.householdId),
            eq(agentAccesses.isActive, true),
            gt(agentAccesses.expiresAt, new Date())
          )
        );

      if (!isProfileOwner && !isHouseholdOwner && !agentAccess && ctx.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update this profile' });
      }

      const [updated] = await db.update(profiles).set(data).where(eq(profiles.id, id)).returning();
      return updated;
    }),

  removeProfile: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.enum(['MOVE_OUT', 'EVICTED', 'LEASE_ENDED']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, input.id));

      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });
      }

      const [seats] = await db
        .select()
        .from(standardSeats)
        .where(eq(standardSeats.householdId, profile.householdId));
      const isHouseholdOwner = seats?.userId === ctx.userId;

      const [agentAccess] = await db
        .select()
        .from(agentAccesses)
        .where(
          and(
            eq(agentAccesses.agentId, ctx.userId!),
            eq(agentAccesses.householdId, profile.householdId),
            eq(agentAccesses.isActive, true),
            gt(agentAccesses.expiresAt, new Date())
          )
        );

      if (!isHouseholdOwner && !agentAccess && !hasPermission(ctx.role, 'households')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot remove this profile' });
      }

      const status =
        input.reason === 'EVICTED'
          ? 'EVICTED'
          : input.reason === 'LEASE_ENDED'
            ? 'LEASE_ENDED'
            : 'REMOVED';

      const [updated] = await db
        .update(profiles)
        .set({ status })
        .where(eq(profiles.id, input.id))
        .returning();
      return updated;
    }),

  getProfile: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, input.id));

    if (!profile || profile.status === 'REMOVED') {
      return null;
    }

    if (!profile.isPublic) {
      return null;
    }

    const [household] = await db
      .select({
        id: households.id,
        street: households.street,
        unit: households.unit,
        homeImage: households.homeImage,
      })
      .from(households)
      .where(eq(households.id, profile.householdId));

    const user = profile.userId
      ? await db
          .select({ id: users.id, name: users.name, email: users.email, avatar: users.avatar })
          .from(users)
          .where(eq(users.id, profile.userId))
          .then(r => r[0])
      : null;

    return {
      ...profile,
      household,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: profile.showEmail ? user.email : undefined,
            avatar: user.avatar,
          }
        : null,
    };
  }),

  upgradeToSolo: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        seatType: z.enum(['RESIDENT', 'MEMBER']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, input.profileId));

      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });
      }

      if (profile.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot upgrade a profile you do not own',
        });
      }

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

      const [existingSeat] = await db
        .select()
        .from(soloSeats)
        .where(eq(soloSeats.userId, ctx.userId!));
      if (existingSeat) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already has a Solo Seat' });
      }

      const [user] = await db.select().from(users).where(eq(users.id, ctx.userId!));
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const platformAddress = `${(user.name || '').toLowerCase().replace(/\s+/g, '.')}@soralia.org`;

      await db.update(profiles).set({ status: 'UPGRADED' }).where(eq(profiles.id, input.profileId));

      const [created] = await db
        .insert(soloSeats)
        .values({
          id: crypto.randomUUID(),
          tenantId: 'soralia',
          userId: ctx.userId!,
          platformAddress,
          seatType: input.seatType,
          householdId: profile.householdId,
          linkedFromProfileId: profile.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId: ctx.organizationId,
        } as any)
        .returning();

      return created;
    }),

  getMySoloSeat: protectedProcedure.query(async ({ ctx }) => {
    const [seat] = await db.select().from(soloSeats).where(eq(soloSeats.userId, ctx.userId!));

    if (!seat) return null;

    const [household] = await db
      .select({
        id: households.id,
        street: households.street,
        unit: households.unit,
        homeImage: households.homeImage,
      })
      .from(households)
      .where(eq(households.id, seat.householdId));

    return { ...seat, household };
  }),

  getSoloSeat: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const [seat] = await db.select().from(soloSeats).where(eq(soloSeats.id, input.id));

    if (!seat) return null;

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        interests: users.interests,
        isPublic: users.isPublic,
        showEmail: users.showEmail,
        showPhone: users.showPhone,
      })
      .from(users)
      .where(eq(users.id, seat.userId));

    if (!user?.isPublic) return null;

    const [household] = await db
      .select({
        id: households.id,
        street: households.street,
        unit: households.unit,
        homeImage: households.homeImage,
      })
      .from(households)
      .where(eq(households.id, seat.householdId));

    return {
      ...seat,
      user: {
        ...user,
        email: user.showEmail ? user.email : undefined,
      },
      household,
    };
  }),

  resolveUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [soloSeat] = await db
        .select()
        .from(soloSeats)
        .where(eq(soloSeats.userId, input.userId));

      if (soloSeat) {
        const [user] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
            interests: users.interests,
            isPublic: users.isPublic,
            showEmail: users.showEmail,
            showPhone: users.showPhone,
          })
          .from(users)
          .where(eq(users.id, soloSeat.userId));

        const [household] = await db
          .select({
            id: households.id,
            street: households.street,
            unit: households.unit,
            homeImage: households.homeImage,
          })
          .from(households)
          .where(eq(households.id, soloSeat.householdId));

        return { type: 'soloSeat', data: { ...soloSeat, user, household } };
      }

      const [profile] = await db
        .select()
        .from(profiles)
        .where(and(eq(profiles.userId, input.userId), eq(profiles.status, 'ACTIVE')));

      if (profile) {
        const [household] = await db
          .select({
            id: households.id,
            street: households.street,
            unit: households.unit,
            homeImage: households.homeImage,
          })
          .from(households)
          .where(eq(households.id, profile.householdId));

        const [user] = await db
          .select({ id: users.id, name: users.name, email: users.email, avatar: users.avatar })
          .from(users)
          .where(eq(users.id, profile.userId));

        return { type: 'profile', data: { ...profile, household, user } };
      }

      const [standardSeat] = await db
        .select()
        .from(standardSeats)
        .where(eq(standardSeats.userId, input.userId));

      if (standardSeat) {
        const [household] = await db
          .select()
          .from(households)
          .where(eq(households.id, standardSeat.householdId));

        const seatsData = await db
          .select()
          .from(standardSeats)
          .where(eq(standardSeats.householdId, standardSeat.householdId));
        const profilesData = await db
          .select()
          .from(profiles)
          .where(
            and(eq(profiles.householdId, standardSeat.householdId), eq(profiles.status, 'ACTIVE'))
          );

        const usersData = await Promise.all(
          seatsData.map(async s => {
            const [u] = await db
              .select({ id: users.id, name: users.name, email: users.email, avatar: users.avatar })
              .from(users)
              .where(eq(users.id, s.userId));
            return u;
          })
        );

        return {
          type: 'standardSeat',
          data: {
            ...standardSeat,
            household: {
              ...household,
              standardSeats: seatsData.map((s, i) => ({ ...s, user: usersData[i] })),
              profiles: profilesData,
            },
          },
        };
      }

      return null;
    }),

  // ============ AGENT ACCESS ============

  requestAgentAccess: protectedProcedure
    .input(
      z.object({
        householdId: z.string(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.role !== 'AGENT') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only agents can request access' });
      }

      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.householdId));

      if (!household) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      const [existing] = await db
        .select()
        .from(agentAccesses)
        .where(
          and(
            eq(agentAccesses.agentId, ctx.userId!),
            eq(agentAccesses.householdId, input.householdId),
            eq(agentAccesses.isActive, true)
          )
        );

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Access already granted' });
      }

      const [agentProfile] = await db.select().from(users).where(eq(users.id, ctx.userId!));

      const [created] = await db
        .insert(agentAccesses)
        .values({
          id: crypto.randomUUID(),
          tenantId: ctx.tenantId || 'soralia',
          agentId: ctx.userId!,
          householdId: input.householdId,
          grantedById: ctx.userId!,
          accessLevel: 'VIEW',
          permissions: ['VIEW'],
          reason: input.reason,
          isActive: false,
          requestedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .returning();

      return created;
    }),

  approveAgentAccess: protectedProcedure
    .input(
      z.object({
        accessId: z.string(),
        level: z.enum(['VIEW', 'MANAGE']).default('VIEW'),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [access] = await db
        .select()
        .from(agentAccesses)
        .where(eq(agentAccesses.id, input.accessId));

      if (!access) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Access request not found' });
      }

      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, access.householdId));
      const [seats] = await db
        .select()
        .from(standardSeats)
        .where(eq(standardSeats.householdId, household?.id));

      const isOwner = seats?.userId === ctx.userId;
      if (!isOwner && !hasPermission(ctx.role, 'households')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only household owner can approve' });
      }

      const expiresDate = input.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const [updated] = await db
        .update(agentAccesses)
        .set({
          isActive: true,
          accessLevel: input.level,
          expiresAt: expiresDate,
          grantedById: ctx.userId!,
          startedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(agentAccesses.id, input.accessId))
        .returning();

      return updated;
    }),

  revokeAgentAccess: protectedProcedure
    .input(z.object({ accessId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [access] = await db
        .select()
        .from(agentAccesses)
        .where(eq(agentAccesses.id, input.accessId));

      if (!access) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Access not found' });
      }

      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, access.householdId));
      const [seats] = await db
        .select()
        .from(standardSeats)
        .where(eq(standardSeats.householdId, household?.id));

      const isOwner = seats?.userId === ctx.userId;
      if (!isOwner && !hasPermission(ctx.role, 'households')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only household owner can revoke' });
      }

      const [updated] = await db
        .update(agentAccesses)
        .set({ isActive: false, updatedAt: new Date() } as any)
        .where(eq(agentAccesses.id, input.accessId))
        .returning();

      return updated;
    }),

  getAgentAccesses: protectedProcedure.query(async ({ ctx }) => {
    return db.select().from(agentAccesses).where(eq(agentAccesses.agentId, ctx.userId!));
  }),

  getHouseholdAgentAccesses: protectedProcedure
    .input(z.object({ householdId: z.string() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(agentAccesses)
        .where(eq(agentAccesses.householdId, input.householdId));
    }),
});
