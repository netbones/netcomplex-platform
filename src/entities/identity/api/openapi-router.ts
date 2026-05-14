import { z } from 'zod';
import {
  openApiRouter,
  openApiPublicProcedure,
  openApiProtectedProcedure,
  openApiAdminProcedure,
} from '@api/trpc/server';
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

// Output Schemas (same as in router.ts)
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
  moveInDate: z.date(),
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
  occupantType: z.enum(['OCCUPANT', 'FAMILY', 'MINOR']),
  residencyType: z.enum(['FAMILY', 'RENTER', 'OWNER_RESIDENT']),
  avatar: z.string().nullable(),
  occupantSince: z.date(),
  status: z.enum(['ACTIVE', 'REMOVED']),
  isPublic: z.boolean(),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
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
  propertyId: z.string(),
  userId: z.string(),
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

export const identityOpenApiRouter = openApiRouter({
  // ============ PROPERTIES (The Assets) ============

  listProperties: openApiAdminProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/properties',
        tags: ['Properties'],
        protect: true, // This indicates authentication is required
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
    .query(async ({ input, ctx }) => {
      // Handle authentication in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
      if (ctx.role !== 'ADMIN' && ctx.role !== 'BOARD') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
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

  getProperty: openApiProtectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/properties/{id}',
        tags: ['Properties'],
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
            moveInDate: z.date(),
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
      // Handle authentication in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
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
      let residents: (typeof profiles.$inferSelect)[] = [];
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

  createProperty: openApiAdminProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/properties',
        tags: ['Properties'],
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
      // Handle authentication and authorization in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
      if (ctx.role !== 'ADMIN' && ctx.role !== 'BOARD') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
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

  listHouseholds: openApiProtectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/properties/{propertyId}/households',
        tags: ['Households'],
        protect: true,
      },
    })
    .input(z.object({ propertyId: z.string() }))
    .output(z.array(householdSchema))
    .query(async ({ input, ctx }) => {
      // Handle authentication in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
      return db
        .select()
        .from(households)
        .where(eq(households.propertyId, input.propertyId))
        .orderBy(desc(households.moveInDate));
    }),

  createHousehold: openApiProtectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/households',
        tags: ['Households'],
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
    .mutation(async ({ input, ctx }) => {
      // Handle authentication in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
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

  getMyProperties: openApiProtectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/my/properties',
        tags: ['Properties'],
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
              moveInDate: z.date(),
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
      // Handle authentication in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
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

          let profilesData: (typeof profiles.$inferSelect)[] = [];
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
            activeHousehold: activeHousehold
              ? { ...activeHousehold, profiles: profilesData }
              : null,
            standardSeats: seatsData,
          };
        })
      );

      return propsWithRelations;
    }),

  // ============ PROFILES (Resident Participation) ============

  createProfile: openApiProtectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/profiles',
        tags: ['Profiles'],
        protect: true,
      },
    })
    .input(
      z.object({
        householdId: z.string(),
        displayName: z.string().min(1),
        occupantType: z.enum(['OCCUPANT', 'FAMILY', 'MINOR']).default('OCCUPANT'),
        residencyType: z.enum(['FAMILY', 'RENTER', 'OWNER_RESIDENT']).default('FAMILY'),
      })
    )
    .output(profileSchema)
    .mutation(async ({ input, ctx }) => {
      // Handle authentication in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
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

  updateProfile: openApiProtectedProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/profiles/{id}',
        tags: ['Profiles'],
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
      // Handle authentication in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
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

  getProfile: openApiPublicProcedure
    .meta({ openapi: { method: 'GET', path: '/profiles/{id}', tags: ['Profiles'] } })
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
          occupantType: z.enum(['OCCUPANT', 'FAMILY', 'MINOR']),
          residencyType: z.enum(['FAMILY', 'RENTER', 'OWNER_RESIDENT']),
          avatar: z.string().nullable(),
          occupantSince: z.date(),
          status: z.enum(['ACTIVE', 'REMOVED']),
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
              moveInDate: z.date(),
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

  getMySoloSeat: openApiProtectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/my/solo-seat',
        tags: ['Solo Seats'],
        protect: true,
      },
    })
    .output(
      z
        .object({
          id: z.string(),
          propertyId: z.string(),
          userId: z.string(),
          createdAt: z.date(),
          updatedAt: z.date(),
          property: propertySchema.nullable(),
        })
        .nullable()
    )
    .query(async ({ ctx }) => {
      // Handle authentication in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
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

  getAgentAccesses: openApiProtectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/my/agent-accesses',
        tags: ['Agent Access'],
        protect: true,
      },
    })
    .output(z.array(agentAccessSchema))
    .query(async ({ ctx }) => {
      // Handle authentication in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
      return db.select().from(agentAccesses).where(eq(agentAccesses.agentId, ctx.userId!));
    }),

  getPropertyAgentAccesses: openApiProtectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/properties/{propertyId}/agent-accesses',
        tags: ['Agent Access'],
        protect: true,
      },
    })
    .input(z.object({ propertyId: z.string() }))
    .output(z.array(agentAccessSchema))
    .query(async ({ input, ctx }) => {
      // Handle authentication in the procedure
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
      return db.select().from(agentAccesses).where(eq(agentAccesses.propertyId, input.propertyId));
    }),
});
