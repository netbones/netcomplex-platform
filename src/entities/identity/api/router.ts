import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '@api/trpc/server';
import { TRPCError } from '@trpc/server';
import { hasPermission } from '@entities/tenant/api/permissions';
import {
  db,
  properties,
  households,
  profiles,
  standardSeats,
  soloSeats,
  agentAccesses,
  users,
} from '@api/db';
import { eq, and, or, asc, desc, gt, ne, like, count } from 'drizzle-orm';

export const identityRouter = router({
  // ============ PROPERTIES (The Assets) ============

  listProperties: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          street: z.string().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { search, street, page, limit } = input || {};
      const skip = ((page || 1) - 1) * (limit || 20);
      const limitVal = limit || 20;

      const conditions = [];
      if (search) {
        conditions.push(
          or(
            like(properties.unit, `%${search}%`),
            like(properties.street, `%${search}%`),
            like(properties.platformAddress, `%${search}%`)
          )
        );
      }
      if (street) conditions.push(eq(properties.street, street));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [propertiesResult, totalResult] = await Promise.all([
        db
          .select()
          .from(properties)
          .where(whereClause)
          .limit(limitVal)
          .offset(skip)
          .orderBy(asc(properties.unit)),
        db.select({ total: count() }).from(properties).where(whereClause),
      ]);

      const total = totalResult[0]?.total || 0;

      const propertiesWithRelations = await Promise.all(
        propertiesResult.map(async prop => {
          const [seats, activeHousehold] = await Promise.all([
            db.select().from(standardSeats).where(eq(standardSeats.propertyId, prop.id)),
            db
              .select()
              .from(households)
              .where(and(eq(households.propertyId, prop.id), eq(households.status, 'ACTIVE')))
              .limit(1)
              .then(r => r[0]),
          ]);
          return {
            ...prop,
            standardSeats: seats,
            activeHousehold,
          };
        })
      );

      return { properties: propertiesWithRelations, total, page: page || 1, limit: limitVal };
    }),

  getProperty: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [property] = await db.select().from(properties).where(eq(properties.id, input.id));

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      const [standardSeatsData, activeHousehold, soloSeatsData] = await Promise.all([
        db.select().from(standardSeats).where(eq(standardSeats.propertyId, input.id)),
        db
          .select()
          .from(households)
          .where(and(eq(households.propertyId, input.id), eq(households.status, 'ACTIVE')))
          .limit(1)
          .then(r => r[0]),
        db.select().from(soloSeats).where(eq(soloSeats.propertyId, input.id)),
      ]);

      const isOwner =
        property.ownerId === ctx.userId || standardSeatsData.some(s => s.userId === ctx.userId);

      const [isAgent] = await db
        .select()
        .from(agentAccesses)
        .where(
          and(
            eq(agentAccesses.agentId, ctx.userId),
            eq(agentAccesses.propertyId, input.id),
            eq(agentAccesses.isActive, true),
            gt(agentAccesses.expiresAt, new Date())
          )
        );

      if (!isOwner && !isAgent && !hasPermission(ctx.role, 'households')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Fetch residents if we have an active household
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let residents: any[] = [];
      if (activeHousehold) {
        residents = await db
          .select()
          .from(profiles)
          .where(and(eq(profiles.householdId, activeHousehold.id), ne(profiles.status, 'REMOVED')));
      }

      return {
        ...property,
        standardSeats: standardSeatsData,
        activeHousehold: activeHousehold ? { ...activeHousehold, profiles: residents } : null,
        soloSeats: soloSeatsData,
      };
    }),

  createProperty: adminProcedure
    .input(
      z.object({
        street: z.string().min(1),
        unit: z.string().min(1),
        platformAddress: z.string().email(),
        homeImage: z.string().optional(),
        ownerId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await db
        .select()
        .from(properties)
        .where(and(eq(properties.street, input.street), eq(properties.unit, input.unit)));

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Property already exists' });
      }

      const now = new Date();
      const [created] = await db
        .insert(properties)
        .values({
          id: crypto.randomUUID(),
          tenantId: ctx.tenantId || 'soralia',
          street: input.street,
          unit: input.unit,
          platformAddress: input.platformAddress,
          homeImage: input.homeImage || null,
          ownerId: input.ownerId || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return created;
    }),

  // ============ HOUSEHOLDS (The Occupancies) ============

  listHouseholds: protectedProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(households)
        .where(eq(households.propertyId, input.propertyId))
        .orderBy(desc(households.moveInDate));
    }),

  createHousehold: protectedProcedure
    .input(
      z.object({
        propertyId: z.string(),
        occupancyType: z.enum(['OWNER_OCCUPIED', 'RENTAL', 'VACANT']),
        moveInDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId));
      if (!property) throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });

      // Deactivate current active household for this property
      await db
        .update(households)
        .set({ status: 'ARCHIVED', moveOutDate: new Date() })
        .where(and(eq(households.propertyId, input.propertyId), eq(households.status, 'ACTIVE')));

      const [created] = await db
        .insert(households)
        .values({
          id: crypto.randomUUID(),
          tenantId: property.tenantId,
          propertyId: input.propertyId,
          occupancyType: input.occupancyType,
          status: 'ACTIVE',
          moveInDate: input.moveInDate || new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return created;
    }),

  getMyProperties: protectedProcedure.query(async ({ ctx }) => {
    const owned = await db
      .select()
      .from(properties)
      .where(eq(properties.ownerId, ctx.userId!))
      .orderBy(asc(properties.unit));

    const seats = await db
      .select()
      .from(standardSeats)
      .where(eq(standardSeats.userId, ctx.userId!));

    const seatPropertyIds = seats.map(s => s.propertyId);
    const seatProperties =
      seatPropertyIds.length > 0
        ? await db
            .select()
            .from(properties)
            .where(and(...seatPropertyIds.map(id => eq(properties.id, id))))
        : [];

    // Combine and unique
    const allProps = [...owned];
    seatProperties.forEach(p => {
      if (!allProps.some(ap => ap.id === p.id)) allProps.push(p);
    });

    const propsWithRelations = await Promise.all(
      allProps.map(async prop => {
        const [activeHousehold, seatsData] = await Promise.all([
          db
            .select()
            .from(households)
            .where(and(eq(households.propertyId, prop.id), eq(households.status, 'ACTIVE')))
            .limit(1)
            .then(r => r[0]),
          db.select().from(standardSeats).where(eq(standardSeats.propertyId, prop.id)),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let profilesData: any[] = [];
        if (activeHousehold) {
          profilesData = await db
            .select()
            .from(profiles)
            .where(
              and(eq(profiles.householdId, activeHousehold.id), eq(profiles.status, 'ACTIVE'))
            );
        }

        return {
          ...prop,
          activeHousehold: activeHousehold ? { ...activeHousehold, profiles: profilesData } : null,
          standardSeats: seatsData,
        };
      })
    );

    return propsWithRelations;
  }),

  // ============ PROFILES (Resident Participation) ============

  createProfile: protectedProcedure
    .input(
      z.object({
        householdId: z.string(),
        displayName: z.string().min(1),
        occupantType: z.enum(['OCCUPANT', 'FAMILY', 'MINOR']).default('OCCUPANT'),
        residencyType: z.enum(['FAMILY', 'RENTER', 'OWNER_RESIDENT']).default('FAMILY'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { householdId, displayName, occupantType, residencyType } = input;

      const [household] = await db.select().from(households).where(eq(households.id, householdId));
      if (!household) throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });

      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, household.propertyId));

      const [seats] = await db
        .select()
        .from(standardSeats)
        .where(eq(standardSeats.propertyId, household.propertyId));
      const isOwner = property?.ownerId === ctx.userId || seats?.userId === ctx.userId;

      if (!isOwner && !hasPermission(ctx.role, 'households')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot add profiles to this household',
        });
      }

      const profileAddress = `${displayName.toLowerCase().replace(/\s+/g, '.')}.${property?.unit}@${property?.platformAddress.split('@')[1]}`;

      const [created] = await db
        .insert(profiles)
        .values({
          id: crypto.randomUUID(),
          tenantId: property?.tenantId || 'soralia',
          householdId,
          displayName,
          profileAddress,
          occupantType,
          residencyType,
          occupantSince: new Date(),
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
      if (!profile) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });

      const isProfileOwner = profile.userId === ctx.userId;
      if (!isProfileOwner && ctx.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update this profile' });
      }

      const [updated] = await db.update(profiles).set(data).where(eq(profiles.id, id)).returning();
      return updated;
    }),

  getProfile: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, input.id));
    if (!profile || profile.status === 'REMOVED' || !profile.isPublic) return null;

    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.id, profile.householdId));
    const [property] = household
      ? await db.select().from(properties).where(eq(properties.id, household.propertyId))
      : [null];

    const user = profile.userId
      ? await db
          .select()
          .from(users)
          .where(eq(users.id, profile.userId))
          .then(r => r[0])
      : null;

    return {
      ...profile,
      household: household ? { ...household, property } : null,
      user,
    };
  }),

  // ============ SOLO SEATS ============

  getMySoloSeat: protectedProcedure.query(async ({ ctx }) => {
    const [seat] = await db.select().from(soloSeats).where(eq(soloSeats.userId, ctx.userId!));
    if (!seat) return null;

    const property = seat.propertyId
      ? await db
          .select()
          .from(properties)
          .where(eq(properties.id, seat.propertyId))
          .then(r => r[0])
      : null;

    return { ...seat, property };
  }),

  // ============ AGENT ACCESS ============

  getAgentAccesses: protectedProcedure.query(async ({ ctx }) => {
    return db.select().from(agentAccesses).where(eq(agentAccesses.agentId, ctx.userId!));
  }),

  getPropertyAgentAccesses: protectedProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ input }) => {
      return db.select().from(agentAccesses).where(eq(agentAccesses.propertyId, input.propertyId));
    }),
});
