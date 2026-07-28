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
const uDto = userDto as any;

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

export const myProfileRouter = router({
  // ============ MY PROFILE (User + Household + Platform Address) ============

  /**
   * Get current user's full profile — user data, household, and platform address.
   * @protected
   */
  getMyProfile: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/my-profile',
        tags: ['Identity'],
        summary: 'Get current user profile',
        protect: true,
      },
    })
    .output(
      toEnvelopeSchema(
        z.object({
          id: z.string(),
          name: z.string().nullable(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
          image: z.string().nullable(),
          avatar: z.string().nullable(),
          role: z.string().nullable(),
          platformAddress: z.string(),
          household: z
            .object({
              id: z.string(),
              name: z.string().nullable(),
              status: z.string(),
              property: z
                .object({
                  id: z.string(),
                  address: z.string(),
                  unitNumber: z.string(),
                  type: z.string(),
                })
                .nullable(),
              members: z.array(
                z.object({
                  id: z.string(),
                  name: z.string().nullable(),
                  email: z.string().nullable(),
                  role: z.string().nullable(),
                })
              ),
            })
            .nullable(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const [user] = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          image: users.image,
          avatar: users.avatar,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Fetch platform address from seats
      const [premiumSeat] = await ctx.db
        .select({ platformAddress: premiumSeats.platformAddress })
        .from(premiumSeats)
        .where(eq(premiumSeats.userId, ctx.userId))
        .limit(1);

      const soloSeatsResult = await ctx.db
        .select({ platformAddress: soloSeats.platformAddress })
        .from(soloSeats)
        .where(eq(soloSeats.userId, ctx.userId))
        .limit(1);

      const [standardSeat] = await ctx.db
        .select({ platformAddress: standardSeats.platformAddress })
        .from(standardSeats)
        .where(eq(standardSeats.userId, ctx.userId))
        .limit(1);

      const platformAddress =
        premiumSeat?.platformAddress ??
        soloSeatsResult[0]?.platformAddress ??
        standardSeat?.platformAddress ??
        '';

      // Fetch household via active profile
      const [activeProfile] = await ctx.db
        .select({ householdId: profiles.householdId })
        .from(profiles)
        .where(and(eq(profiles.userId, ctx.userId), eq(profiles.status, 'ACTIVE')))
        .limit(1);

      let household = null;

      if (activeProfile?.householdId) {
        const [householdRow] = await ctx.db
          .select({
            id: households.id,
            occupancyType: households.occupancyType,
            status: households.status,
            propertyId: households.propertyId,
          })
          .from(households)
          .where(eq(households.id, activeProfile.householdId))
          .limit(1);

        if (householdRow) {
          const [property] = await ctx.db
            .select({
              id: properties.id,
              street: properties.street,
              unit: properties.unit,
              platformAddress: properties.platformAddress,
            })
            .from(properties)
            .where(eq(properties.id, householdRow.propertyId))
            .limit(1);

          const members = await ctx.db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
            })
            .from(profiles)
            .innerJoin(users, eq(profiles.userId, users.id))
            .where(
              and(
                eq(profiles.householdId, activeProfile.householdId),
                eq(profiles.status, 'ACTIVE')
              )
            );

          household = {
            id: householdRow.id,
            name: householdRow.occupancyType,
            status: householdRow.status,
            property: property
              ? {
                  id: property.id,
                  address: property.street,
                  unitNumber: property.unit,
                  type: property.platformAddress,
                }
              : null,
            members,
          };
        }
      }

      return toEnvelope({
        ...user,
        platformAddress,
        household,
      });
    }),

  /**
   * Update current user's profile fields.
   * @protected
   */
  updateMyProfile: protectedProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/identity/my-profile',
        tags: ['Identity'],
        summary: 'Update current user profile',
        protect: true,
      },
    })
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        avatar: z.string().optional(),
        profileData: z.record(z.unknown()).optional(),
      })
    )
    .output(toEnvelopeSchema(uDto.passthrough()))
    .mutation(async ({ input, ctx }) => {
      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.avatar !== undefined) {
        updateData.avatar = input.avatar;
        updateData.image = input.avatar;
      }
      if (input.profileData !== undefined) updateData.profileData = input.profileData;

      const [updated] = await ctx.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, ctx.userId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      return toEnvelope(updated);
    }),
});
