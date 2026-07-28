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

export const usersRouter = router({
  // ============ USERS (Directory) ============

  /**
   * List tenant users with optional filters — tenant-scoped.
   * @tenant
   */
  listUsers: tenantProcedure
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
      toEnvelopeSchema(
        z.object({
          users: z.array(
            uDto.extend({
              phone: z.string().nullable(),
              interests: z.array(z.string()),
              avatar: z.string().nullable(),
              isPublic: z.boolean(),
              profileSlug: z.string().nullable(),
              updatedAt: z.date(),
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
    )
    .query(async ({ input, ctx }) => {
      const { search, role, page, limit } = input || {};
      const pageVal = page || 1;
      const limitVal = limit || 20;
      const skip = (pageVal - 1) * limitVal;

      const canViewAll = hasPermission(ctx.role, 'directory');

      // Build base conditions — mirroring GET /api/users REST handler
      const conditions: SQL<unknown>[] = [
        eq(users.tenantId, ctx.tenantId),
        eq(users.isActive, true),
        ne(users.role, 'AGENT'),
        sql`(
          EXISTS (SELECT 1 FROM "StandardSeat" WHERE "userId" = ${users.id})
          OR EXISTS (SELECT 1 FROM "SoloSeat" WHERE "userId" = ${users.id})
          OR EXISTS (SELECT 1 FROM "Profile" WHERE "userId" = ${users.id} AND "status" = 'ACTIVE')
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
      const userResults = await ctx.db
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
      const totalResult = await ctx.db.select({ total: count() }).from(users).where(whereClause);
      const total = totalResult[0]?.total || 0;

      // Batch fetch all related data in 4 queries instead of 4N
      const userIds = userResults.map(u => u.id);
      const [allSeats, allSoloSeats, allPremiumSeats, allProfiles] =
        userIds.length > 0
          ? await Promise.all([
              ctx.db
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
              ctx.db
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
              ctx.db
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
              ctx.db
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
                    eq(profiles.tenantId, ctx.tenantId),
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
        ...userDto.parse(user),
        phone: user.phone,
        interests: user.interests,
        avatar: user.avatar,
        isPublic: user.isPublic,
        profileSlug: user.profileSlug,
        updatedAt: new Date(), // not fetched from DB — placeholder
        standardSeats: seatMap.get(user.id) || [],
        soloSeats: soloMap.get(user.id) || [],
        premiumSeat: premiumMap.get(user.id) || null,
        profiles: profileMap.get(user.id) || [],
      }));

      return toEnvelope({ users: usersWithRelations, total, page: pageVal, limit: limitVal });
    }),
});
