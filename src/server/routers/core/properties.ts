import { z } from 'zod';
import {
  agentAccesses,
  households,
  now,
  privilegedProcedure,
  profiles,
  properties,
  protectedProcedure,
  router,
  soloSeats,
  standardSeats,
  tenantProcedure,
  toEnvelope,
  toEnvelopeSchema,
  propertyDto,
  profileDto,
  seatDto,
  standardSeatDto,
} from '@api/server';

// Zod v4 DTOs (from drizzle-zod) are incompatible with Zod v3's ZodTypeAny constraint
// used by tRPC's output validation. Cast to any for output schema references.
// The runtime validation still uses the v4 DTOs via .parse() calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pDto = propertyDto as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prDto = profileDto as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sDto = seatDto as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ssDto = standardSeatDto as any;

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import { eq, and, or, asc, gt, ne, like, count, inArray, InferSelectModel } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const propertiesRouter = router({
  // ============ PROPERTIES (The Assets) ============

  /**
   * Get current user's owned properties (via standardSeats where isPrimaryOwner=true).
   * Self-service — no staff role required. Used by widgets/identity hooks.
   * @tenant
   */
  getMyProperties: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/properties/mine',
        tags: ['Identity'],
        summary: 'Get current user owned properties',
        protect: true,
      },
    })
    .output(
      toEnvelopeSchema(
        z.array(
          pDto.extend({
            tenantId: z.string(),
            updatedAt: z.date(),
            standardSeats: z.array(ssDto.passthrough()),
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
              })
              .nullable(),
          })
        )
      )
    )
    .query(async ({ ctx }) => {
      const ownedSeats = await ctx.db
        .select({ propertyId: standardSeats.propertyId })
        .from(standardSeats)
        .where(and(eq(standardSeats.userId, ctx.userId), eq(standardSeats.isPrimaryOwner, true)));

      if (ownedSeats.length === 0) return toEnvelope([]);

      const propertyIds = [...new Set(ownedSeats.map(s => s.propertyId))];
      const owned = await ctx.db
        .select()
        .from(properties)
        .where(inArray(properties.id, propertyIds));

      return toEnvelope(
        owned.map(p => ({
          ...p,
          tenantId: p.tenantId,
          updatedAt: p.updatedAt,
          standardSeats: [],
          activeHousehold: null,
        }))
      );
    }),

  /**
   * List all properties in the current tenant — staff only.
   * @privileged
   */
  listProperties: privilegedProcedure
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
      toEnvelopeSchema(
        z.object({
          properties: z.array(
            pDto.extend({
              tenantId: z.string(),
              updatedAt: z.date(),
              standardSeats: z.array(ssDto.passthrough()),
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
                })
                .nullable(),
            })
          ),
          total: z.number(),
          page: z.number(),
          limit: z.number(),
        })
      )
    )
    .query(async ({ input, ctx }) => {
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
        ctx.db
          .select()
          .from(properties)
          .where(whereClause)
          .limit(limitVal)
          .offset(skip)
          .orderBy(asc(properties.unit)),
        ctx.db.select({ total: count() }).from(properties).where(whereClause),
      ]);

      const total = totalResult[0]?.total || 0;

      const propertiesWithRelations = await Promise.all(
        propertiesResult.map(async prop => {
          const [seats, activeHousehold] = await Promise.all([
            ctx.db.select().from(standardSeats).where(eq(standardSeats.propertyId, prop.id)),
            ctx.db
              .select()
              .from(households)
              .where(and(eq(households.propertyId, prop.id), eq(households.status, 'ACTIVE')))
              .limit(1)
              .then(r => r[0]),
          ]);
          return {
            ...propertyDto.parse(prop),
            tenantId: prop.tenantId,
            updatedAt: prop.updatedAt,
            standardSeats: seats,
            activeHousehold,
          };
        })
      );

      return toEnvelope({
        properties: propertiesWithRelations,
        total,
        page: page || 1,
        limit: limitVal,
      });
    }),

  /**
   * Get a property by ID — tenant-scoped.
   * @tenant
   */
  getProperty: tenantProcedure
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
      toEnvelopeSchema(
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
          standardSeats: z.array(ssDto.passthrough()),
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
              profiles: z.array(prDto.passthrough()),
            })
            .nullable(),
          soloSeats: z.array(sDto.passthrough()),
        })
      )
    )
    .query(async ({ input, ctx }) => {
      const [property] = await ctx.db.select().from(properties).where(eq(properties.id, input.id));

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      const [standardSeatsData, activeHousehold, soloSeatsData] = await Promise.all([
        ctx.db.select().from(standardSeats).where(eq(standardSeats.propertyId, input.id)),
        ctx.db
          .select()
          .from(households)
          .where(and(eq(households.propertyId, input.id), eq(households.status, 'ACTIVE')))
          .limit(1)
          .then(r => r[0]),
        ctx.db.select().from(soloSeats).where(eq(soloSeats.propertyId, input.id)),
      ]);

      const isOwner =
        property.ownerId === ctx.userId || standardSeatsData.some(s => s.userId === ctx.userId);

      const [isAgent] = await ctx.db
        .select()
        .from(agentAccesses)
        .where(
          and(
            eq(agentAccesses.agentId, ctx.userId),
            eq(agentAccesses.propertyId, input.id),
            eq(agentAccesses.status, 'ACTIVE'),
            gt(agentAccesses.expiresAt, new Date())
          )
        );

      if (!isOwner && !isAgent && !hasPermission(ctx.role, 'households')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Fetch residents if we have an active household
      let residents: InferSelectModel<typeof profiles>[] = [];
      if (activeHousehold) {
        residents = await ctx.db
          .select()
          .from(profiles)
          .where(and(eq(profiles.householdId, activeHousehold.id), ne(profiles.status, 'REMOVED')));
      }

      return toEnvelope({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(propertyDto.parse(property) as any),
        tenantId: property.tenantId,
        updatedAt: property.updatedAt,
        standardSeats: standardSeatsData,
        activeHousehold: activeHousehold ? { ...activeHousehold, profiles: residents } : null,
        soloSeats: soloSeatsData,
      });
    }),

  /**
   * Create a new property — staff only.
   * @privileged
   */
  createProperty: privilegedProcedure
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
    .output(toEnvelopeSchema(pDto))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(properties)
        .where(and(eq(properties.street, input.street), eq(properties.unit, input.unit)));

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Property already exists' });
      }

      const ts = now();
      const [created] = await ctx.db
        .insert(properties)
        .values({
          id: createId(),
          tenantId: ctx.tenantId,
          street: input.street,
          unit: input.unit,
          platformAddress: input.platformAddress,
          homeImage: input.homeImage || null,
          ownerId: input.ownerId || null,
          createdAt: ts,
          updatedAt: ts,
        })
        .returning();

      return toEnvelope(propertyDto.parse(created));
    }),
});
