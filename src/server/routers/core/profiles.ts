import { z } from 'zod';
import {
  agentAccesses,
  albums,
  bookings,
  conversationParticipants,
  db,
  households,
  maintenanceRequests,
  notDeleted,
  notifications,
  now,
  platformSuspensions,
  premiumSeats,
  privilegedProcedure,
  profiles,
  properties,
  protectedProcedure,
  publicProcedure,
  router,
  soloSeats,
  standardSeats,
  tenantProcedure,
  toEnvelope,
  toEnvelopeSchema,
  users,
  writeAuditLog,
} from '@api/server';
import {
  propertyDto,
  userDto,
  profileDto,
  albumDto,
  seatDto,
  premiumSeatDto,
  standardSeatDto,
  agentAccessDto,
  suspensionDto,
} from '@api/server';

// Zod v4 DTOs (from drizzle-zod) are incompatible with Zod v3's ZodTypeAny constraint
// used by tRPC's output validation. Cast to any for output schema references.
// The runtime validation still uses the v4 DTOs via .parse() calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pDto = propertyDto as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const uDto = userDto as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prDto = profileDto as any;

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
import { createId } from '@shared/lib/id';

export const profilesRouter = router({
  // ============ PROFILES (Resident Participation) ============

  /**
   * Create a profile — tenant-scoped.
   * @tenant
   */
  createProfile: tenantProcedure
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
    .output(toEnvelopeSchema(prDto.passthrough()))
    .mutation(async ({ input, ctx }) => {
      const { householdId, displayName, householdRole, residencyType } = input;

      const [household] = await ctx.db
        .select()
        .from(households)
        .where(eq(households.id, householdId));
      if (!household) throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });

      const [property] = await ctx.db
        .select()
        .from(properties)
        .where(eq(properties.id, household.propertyId));

      const [seats] = await ctx.db
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

      const [created] = await ctx.db
        .insert(profiles)
        .values({
          id: createId(),
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

      return toEnvelope(profileDto.parse(created));
    }),

  /**
   * Update a profile — user-scoped.
   * @tenant
   */
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
    .output(toEnvelopeSchema(prDto.passthrough()))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const [profile] = await ctx.db.select().from(profiles).where(eq(profiles.id, id));
      if (!profile) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });

      const isProfileOwner = profile.userId === ctx.userId;
      if (!isProfileOwner && ctx.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update this profile' });
      }

      const [updated] = await ctx.db
        .update(profiles)
        .set(data)
        .where(eq(profiles.id, id))
        .returning();
      return toEnvelope(profileDto.parse(updated));
    }),

  /**
   * Get a public profile — no auth required.
   * @public
   */
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
      toEnvelopeSchema(
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
                property: pDto.nullable(),
              })
              .nullable(),
            user: uDto.nullable(),
          })
          .nullable()
      )
    )
    .query(async ({ input }) => {
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, input.id));
      if (!profile || profile.status === 'REMOVED' || !profile.isPublic) return toEnvelope(null);

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

      return toEnvelope({
        ...profile,
        household: household ? { ...household, property } : null,
        user,
      });
    }),
});
