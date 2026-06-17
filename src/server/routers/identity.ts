import { z } from 'zod';
import {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  db,
  properties,
  households,
  profiles,
  standardSeats,
  soloSeats,
  premiumSeats,
  agentAccesses,
  users,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import {
  eq,
  and,
  or,
  asc,
  desc,
  gt,
  ne,
  like,
  count,
  ilike,
  inArray,
  sql,
  InferSelectModel,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

// Output Schemas
const propertySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  street: z.string(),
  unit: z.string(),
  platformAddress: z.string(),
  homeImage: z.string().nullable(),
  ownerId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const standardSeatSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  userId: z.string(),
  isPrimaryOwner: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const householdSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  propertyId: z.string(),
  occupancyType: z.enum(['OWNER_OCCUPIED', 'RENTAL', 'VACANT']),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  moveInDate: z.date().nullable(),
  moveOutDate: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const profileSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  householdId: z.string(),
  userId: z.string().nullable(),
  displayName: z.string(),
  profileAddress: z.string(),
  householdRole: z.enum(['OCCUPANT', 'FAMILY', 'MINOR']),
  residencyType: z.enum(['FAMILY', 'RENTER', 'OWNER']),
  avatar: z.string().nullable(),
  occupantSince: z.date(),
  status: z.enum(['ACTIVE', 'UPGRADED', 'REMOVED', 'EVICTED', 'LEASE_ENDED']),
  isPublic: z.boolean(),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  organizationId: z.string().nullable(),
  occupantImage: z.string().nullable(),
  rentalImage: z.string().nullable(),
  landlordId: z.string().nullable(),
  leaseStartDate: z.date().nullable(),
  leaseEndDate: z.date().nullable(),
});

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  role: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const soloSeatSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  platformAddress: z.string(),
  propertyId: z.string().nullable(),
  seatType: z.string(),
  isComplimentary: z.boolean(),
  linkedFromProfileId: z.string().nullable(),
  organizationId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const agentAccessSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  propertyId: z.string(),
  isActive: z.boolean(),
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const identityRouter = router({
  // ============ PROPERTIES (The Assets) ============

  listProperties: adminProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/properties',
        tags: ['Identity'],
        summary: 'List all properties',
        protect: true,
      },
    })
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
    .output(
      z.object({
        properties: z.array(
          z.object({
            id: z.string(),
            tenantId: z.string(),
            street: z.string(),
            unit: z.string(),
            platformAddress: z.string(),
            homeImage: z.string().nullable(),
            ownerId: z.string().nullable(),
            createdAt: z.date(),
            updatedAt: z.date(),
            standardSeats: z.array(standardSeatSchema),
            activeHousehold: householdSchema.nullable(),
          })
        ),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      })
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
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/properties/{id}',
        tags: ['Identity'],
        summary: 'Get a property by ID',
        protect: true,
      },
    })
    .input(z.object({ id: z.string() }))
    .output(
      z.object({
        id: z.string(),
        tenantId: z.string(),
        street: z.string(),
        unit: z.string(),
        platformAddress: z.string(),
        homeImage: z.string().nullable(),
        ownerId: z.string().nullable(),
        createdAt: z.date(),
        updatedAt: z.date(),
        standardSeats: z.array(standardSeatSchema),
        activeHousehold: z
          .object({
            id: z.string(),
            tenantId: z.string(),
            propertyId: z.string(),
            occupancyType: z.enum(['OWNER_OCCUPIED', 'RENTAL', 'VACANT']),
            status: z.enum(['ACTIVE', 'ARCHIVED']),
            moveInDate: z.date().nullable(),
            moveOutDate: z.date().nullable(),
            createdAt: z.date(),
            updatedAt: z.date(),
            profiles: z.array(profileSchema),
          })
          .nullable(),
        soloSeats: z.array(soloSeatSchema),
      })
    )
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
      let residents: InferSelectModel<typeof profiles>[] = [];
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
    .meta({
      openapi: {
        method: 'POST',
        path: '/identity/properties',
        tags: ['Identity'],
        summary: 'Create a property',
        protect: true,
      },
    })
    .input(
      z.object({
        street: z.string().min(1),
        unit: z.string().min(1),
        platformAddress: z.string().email(),
        homeImage: z.string().optional(),
        ownerId: z.string().optional(),
      })
    )
    .output(propertySchema)
    .mutation(async ({ input, ctx }) => {
      const [existing] = await db
        .select()
        .from(properties)
        .where(and(eq(properties.street, input.street), eq(properties.unit, input.unit)));

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Property already exists' });
      }

      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context is required' });
      }

      const now = new Date();
      const [created] = await db
        .insert(properties)
        .values({
          id: crypto.randomUUID(),
          tenantId: ctx.tenantId,
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

  // ============ USERS (Directory) ============

  listUsers: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/users',
        tags: ['Identity'],
        summary: 'List tenant users with optional filters',
        protect: true,
      },
    })
    .input(
      z
        .object({
          search: z.string().optional(),
          role: z.string().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .output(
      z.object({
        users: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            phone: z.string().nullable(),
            interests: z.array(z.string()),
            avatar: z.string().nullable(),
            isPublic: z.boolean(),
            isActive: z.boolean(),
            role: z.string(),
            profileSlug: z.string().nullable(),
            standardSeats: z.array(
              z.object({
                property: z.object({
                  id: z.string(),
                  street: z.string(),
                  unit: z.string(),
                  homeImage: z.string().nullable(),
                }),
                isPrimaryOwner: z.boolean(),
                platformAddress: z.string(),
              })
            ),
            soloSeats: z.array(
              z.object({
                property: z
                  .object({
                    id: z.string(),
                    street: z.string(),
                    unit: z.string(),
                    homeImage: z.string().nullable(),
                  })
                  .nullable(),
                seatType: z.string(),
                platformAddress: z.string(),
              })
            ),
            premiumSeat: z
              .object({
                id: z.string(),
                platformAddress: z.string(),
                portfolioName: z.string().nullable(),
                tier: z.string(),
                isActive: z.boolean(),
              })
              .nullable(),
            profiles: z.array(
              z.object({
                householdId: z.string(),
                householdRole: z.string(),
                residencyType: z.string(),
                rentalImage: z.string().nullable(),
                occupantImage: z.string().nullable(),
                property: z.object({
                  id: z.string(),
                  street: z.string(),
                  unit: z.string(),
                  homeImage: z.string().nullable(),
                  platformAddress: z.string(),
                }),
              })
            ),
          })
        ),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { search, role, page, limit } = input || {};
      const pageVal = page || 1;
      const limitVal = limit || 20;
      const skip = (pageVal - 1) * limitVal;

      const canViewAll = hasPermission(ctx.role, 'directory');

      // Build base conditions — mirroring GET /api/users REST handler
      const conditions: SQL<unknown>[] = [
        eq(users.tenantId, ctx.tenantId!),
        eq(users.isActive, true),
        ne(users.role, 'AGENT'),
        sql`(
          EXISTS (SELECT 1 FROM "standardSeat" WHERE "userId" = ${users.id})
          OR EXISTS (SELECT 1 FROM "soloSeat" WHERE "userId" = ${users.id})
          OR EXISTS (SELECT 1 FROM "profile" WHERE "userId" = ${users.id} AND "status" = 'ACTIVE')
        )`,
      ];

      if (!canViewAll) {
        conditions.push(eq(users.isPublic, true));
      }

      if (search) {
        const searchCondition = or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`)
        );
        if (searchCondition) conditions.push(searchCondition);
      }

      if (role) {
        const validRoles = ['ADMIN', 'BOARD', 'COMMITTEE', 'RESIDENT'] as const;
        type ValidRole = (typeof validRoles)[number];
        if ((validRoles as readonly string[]).includes(role)) {
          conditions.push(eq(users.role, role as ValidRole));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get users with pagination
      const userResults = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          interests: users.interests,
          avatar: users.avatar,
          isPublic: users.isPublic,
          isActive: users.isActive,
          role: users.role,
          profileSlug: users.profileSlug,
        })
        .from(users)
        .where(whereClause)
        .orderBy(asc(users.name))
        .limit(limitVal)
        .offset(skip);

      // Get total count
      const totalResult = await db.select({ total: count() }).from(users).where(whereClause);
      const total = totalResult[0]?.total || 0;

      // Batch fetch all related data in 4 queries instead of 4N
      const userIds = userResults.map(u => u.id);
      const [allSeats, allSoloSeats, allPremiumSeats, allProfiles] =
        userIds.length > 0
          ? await Promise.all([
              db
                .select({
                  userId: standardSeats.userId,
                  property: {
                    id: properties.id,
                    street: properties.street,
                    unit: properties.unit,
                    homeImage: properties.homeImage,
                  },
                  isPrimaryOwner: standardSeats.isPrimaryOwner,
                  platformAddress: standardSeats.platformAddress,
                })
                .from(standardSeats)
                .innerJoin(properties, eq(standardSeats.propertyId, properties.id))
                .where(inArray(standardSeats.userId, userIds)),
              db
                .select({
                  userId: soloSeats.userId,
                  property: {
                    id: properties.id,
                    street: properties.street,
                    unit: properties.unit,
                    homeImage: properties.homeImage,
                  },
                  seatType: soloSeats.seatType,
                  platformAddress: soloSeats.platformAddress,
                })
                .from(soloSeats)
                .leftJoin(properties, eq(soloSeats.propertyId, properties.id))
                .where(inArray(soloSeats.userId, userIds)),
              db
                .select({
                  userId: premiumSeats.userId,
                  id: premiumSeats.id,
                  platformAddress: premiumSeats.platformAddress,
                  portfolioName: premiumSeats.portfolioName,
                  tier: premiumSeats.tier,
                  isActive: premiumSeats.isActive,
                })
                .from(premiumSeats)
                .where(inArray(premiumSeats.userId, userIds)),
              db
                .select({
                  userId: profiles.userId,
                  householdId: profiles.householdId,
                  householdRole: profiles.householdRole,
                  residencyType: profiles.residencyType,
                  rentalImage: profiles.rentalImage,
                  occupantImage: profiles.occupantImage,
                  property: {
                    id: properties.id,
                    street: properties.street,
                    unit: properties.unit,
                    homeImage: properties.homeImage,
                    platformAddress: properties.platformAddress,
                  },
                })
                .from(profiles)
                .innerJoin(households, eq(profiles.householdId, households.id))
                .innerJoin(properties, eq(households.propertyId, properties.id))
                .where(
                  and(
                    eq(profiles.tenantId, ctx.tenantId!),
                    inArray(profiles.userId, userIds),
                    eq(profiles.status, 'ACTIVE' as const)
                  )
                ),
            ])
          : [[], [], [], []];

      const seatMap = new Map<string, typeof allSeats>();
      const soloMap = new Map<string, typeof allSoloSeats>();
      const premiumMap = new Map<string, (typeof allPremiumSeats)[0]>();
      const profileMap = new Map<string, typeof allProfiles>();
      for (const s of allSeats) {
        const arr = seatMap.get(s.userId);
        if (arr) arr.push(s);
        else seatMap.set(s.userId, [s]);
      }
      for (const s of allSoloSeats) {
        const arr = soloMap.get(s.userId);
        if (arr) arr.push(s);
        else soloMap.set(s.userId, [s]);
      }
      for (const p of allPremiumSeats) {
        if (!premiumMap.has(p.userId)) premiumMap.set(p.userId, p);
      }
      for (const p of allProfiles) {
        const uid = p.userId;
        if (!uid) continue;
        const arr = profileMap.get(uid);
        if (arr) arr.push(p);
        else profileMap.set(uid, [p]);
      }

      const usersWithRelations = userResults.map(user => ({
        ...user,
        standardSeats: seatMap.get(user.id) || [],
        soloSeats: soloMap.get(user.id) || [],
        premiumSeat: premiumMap.get(user.id) || null,
        profiles: profileMap.get(user.id) || [],
      }));

      return { users: usersWithRelations, total, page: pageVal, limit: limitVal };
    }),

  // ============ HOUSEHOLDS (The Occupancies) ============

  listHouseholds: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/households',
        tags: ['Identity'],
        summary: 'List households for a property',
        protect: true,
      },
    })
    .input(z.object({ propertyId: z.string() }))
    .output(z.array(householdSchema))
    .query(async ({ input }) => {
      return db
        .select()
        .from(households)
        .where(eq(households.propertyId, input.propertyId))
        .orderBy(desc(households.moveInDate));
    }),

  createHousehold: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/identity/households',
        tags: ['Identity'],
        summary: 'Create a household',
        protect: true,
      },
    })
    .input(
      z.object({
        propertyId: z.string(),
        occupancyType: z.enum(['OWNER_OCCUPIED', 'RENTAL', 'VACANT']),
        moveInDate: z.date().optional(),
      })
    )
    .output(householdSchema)
    .mutation(async ({ input }) => {
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

  getMyProperties: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/properties/my',
        tags: ['Identity'],
        summary: 'Get my properties',
        protect: true,
      },
    })
    .output(
      z.array(
        z.object({
          id: z.string(),
          tenantId: z.string(),
          street: z.string(),
          unit: z.string(),
          platformAddress: z.string(),
          homeImage: z.string().nullable(),
          ownerId: z.string().nullable(),
          createdAt: z.date(),
          updatedAt: z.date(),
          activeHousehold: z
            .object({
              id: z.string(),
              tenantId: z.string(),
              propertyId: z.string(),
              occupancyType: z.enum(['OWNER_OCCUPIED', 'RENTAL', 'VACANT']),
              status: z.enum(['ACTIVE', 'ARCHIVED']),
              moveInDate: z.date().nullable(),
              moveOutDate: z.date().nullable(),
              createdAt: z.date(),
              updatedAt: z.date(),
              profiles: z.array(profileSchema),
            })
            .nullable(),
          standardSeats: z.array(standardSeatSchema),
        })
      )
    )
    .query(async ({ ctx }) => {
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
          ? await db.select().from(properties).where(inArray(properties.id, seatPropertyIds))
          : [];

      // Combine and unique
      const allProps = [...owned];
      for (const p of seatProperties) {
        if (!allProps.some(ap => ap.id === p.id)) allProps.push(p);
      }

      // Batch fetch households and seats for all properties
      const propIds = allProps.map(p => p.id);
      const [allHouseholds, allSeatsData] =
        propIds.length > 0
          ? await Promise.all([
              db
                .select()
                .from(households)
                .where(
                  and(inArray(households.propertyId, propIds), eq(households.status, 'ACTIVE'))
                ),
              db.select().from(standardSeats).where(inArray(standardSeats.propertyId, propIds)),
            ])
          : [[], []];

      const householdMap = new Map<string, (typeof allHouseholds)[0]>();
      for (const h of allHouseholds) {
        if (!householdMap.has(h.propertyId)) householdMap.set(h.propertyId, h);
      }

      const seatMap = new Map<string, typeof allSeatsData>();
      for (const s of allSeatsData) {
        const arr = seatMap.get(s.propertyId);
        if (arr) arr.push(s);
        else seatMap.set(s.propertyId, [s]);
      }

      // Batch fetch profiles for all active households
      const activeHouseholdIds = allHouseholds.map(h => h.id);
      const allProfiles =
        activeHouseholdIds.length > 0
          ? await db
              .select()
              .from(profiles)
              .where(
                and(
                  inArray(profiles.householdId, activeHouseholdIds),
                  eq(profiles.status, 'ACTIVE')
                )
              )
          : [];

      const profileMap = new Map<string, InferSelectModel<typeof profiles>[]>();
      for (const p of allProfiles) {
        const arr = profileMap.get(p.householdId);
        if (arr) arr.push(p);
        else profileMap.set(p.householdId, [p]);
      }

      const propsWithRelations = allProps.map(prop => {
        const activeHousehold = householdMap.get(prop.id) || null;
        return {
          ...prop,
          activeHousehold: activeHousehold
            ? { ...activeHousehold, profiles: profileMap.get(activeHousehold.id) || [] }
            : null,
          standardSeats: seatMap.get(prop.id) || [],
        };
      });

      return propsWithRelations;
    }),

  // ============ PROFILES (Resident Participation) ============

  createProfile: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/identity/profiles',
        tags: ['Identity'],
        summary: 'Create a profile',
        protect: true,
      },
    })
    .input(
      z.object({
        householdId: z.string(),
        displayName: z.string().min(1),
        householdRole: z.enum(['OCCUPANT', 'FAMILY', 'MINOR']).default('OCCUPANT'),
        residencyType: z.enum(['FAMILY', 'RENTER', 'OWNER']).default('FAMILY'),
      })
    )
    .output(profileSchema)
    .mutation(async ({ input, ctx }) => {
      const { householdId, displayName, householdRole, residencyType } = input;

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

      if (!property?.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Property tenant context is required',
        });
      }

      const [created] = await db
        .insert(profiles)
        .values({
          id: crypto.randomUUID(),
          tenantId: property.tenantId,
          householdId,
          displayName,
          profileAddress,
          householdRole,
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
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/identity/profiles/{id}',
        tags: ['Identity'],
        summary: 'Update a profile',
        protect: true,
      },
    })
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
    .output(profileSchema)
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

  getProfile: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/profiles/{id}',
        tags: ['Identity'],
        summary: 'Get a public profile',
        protect: false,
      },
    })
    .input(z.object({ id: z.string() }))
    .output(
      z
        .object({
          id: z.string(),
          tenantId: z.string(),
          householdId: z.string(),
          userId: z.string().nullable(),
          displayName: z.string(),
          profileAddress: z.string(),
          householdRole: z.enum(['OCCUPANT', 'FAMILY', 'MINOR']),
          residencyType: z.enum(['FAMILY', 'RENTER', 'OWNER']),
          avatar: z.string().nullable(),
          occupantSince: z.date(),
          status: z.enum(['ACTIVE', 'UPGRADED', 'REMOVED', 'EVICTED', 'LEASE_ENDED']),
          isPublic: z.boolean(),
          showEmail: z.boolean(),
          showPhone: z.boolean(),
          createdAt: z.date(),
          updatedAt: z.date(),
          household: z
            .object({
              id: z.string(),
              tenantId: z.string(),
              propertyId: z.string(),
              occupancyType: z.enum(['OWNER_OCCUPIED', 'RENTAL', 'VACANT']),
              status: z.enum(['ACTIVE', 'ARCHIVED']),
              moveInDate: z.date().nullable(),
              moveOutDate: z.date().nullable(),
              createdAt: z.date(),
              updatedAt: z.date(),
              property: propertySchema.nullable(),
            })
            .nullable(),
          user: userSchema.nullable(),
        })
        .nullable()
    )
    .query(async ({ input }) => {
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

  getMySoloSeat: protectedProcedure
    .meta({ openapi: { method: 'GET', path: '/my/solo-seat', tags: ['Solo Seats'] } })
    .output(
      z
        .object({
          id: z.string(),
          tenantId: z.string(),
          userId: z.string(),
          platformAddress: z.string(),
          propertyId: z.string().nullable(),
          seatType: z.string(),
          isComplimentary: z.boolean(),
          linkedFromProfileId: z.string().nullable(),
          organizationId: z.string().nullable(),
          createdAt: z.date(),
          updatedAt: z.date(),
          property: propertySchema.nullable(),
        })
        .nullable()
    )
    .query(async ({ ctx }) => {
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

  getAgentAccesses: protectedProcedure
    .meta({ openapi: { method: 'GET', path: '/my/agent-accesses', tags: ['Agent Access'] } })
    .output(z.array(agentAccessSchema))
    .query(async ({ ctx }) => {
      return db.select().from(agentAccesses).where(eq(agentAccesses.agentId, ctx.userId!));
    }),

  getPropertyAgentAccesses: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/properties/{propertyId}/agent-accesses',
        tags: ['Agent Access'],
      },
    })
    .input(z.object({ propertyId: z.string() }))
    .output(z.array(agentAccessSchema))
    .query(async ({ input }) => {
      return db.select().from(agentAccesses).where(eq(agentAccesses.propertyId, input.propertyId));
    }),
});
