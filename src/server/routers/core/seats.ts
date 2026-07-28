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
const sDto = seatDto as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const psDto = premiumSeatDto as any;

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

export const seatsRouter = router({
  // ============ SEATS ============

  /**
   * Get current user's seat info — tenant-scoped.
   * @tenant
   */
  getMySeat: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/seats/my',
        tags: ['Identity'],
        summary: 'Get current user seat info',
        protect: true,
      },
    })
    .output(
      toEnvelopeSchema(
        z.object({
          solo: sDto.passthrough().nullable(),
          premium: psDto.passthrough().nullable(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const [solo] = await ctx.db
        .select()
        .from(soloSeats)
        .where(and(eq(soloSeats.userId, ctx.userId), eq(soloSeats.tenantId, ctx.tenantId)))
        .limit(1);

      const [premium] = await ctx.db
        .select()
        .from(premiumSeats)
        .where(and(eq(premiumSeats.userId, ctx.userId), eq(premiumSeats.tenantId, ctx.tenantId)))
        .limit(1);

      return toEnvelope({ solo: solo || null, premium: premium || null });
    }),

  /**
   * List all seats — staff only.
   * @privileged
   */
  listSeats: privilegedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/seats',
        tags: ['Identity'],
        summary: 'List all seats (admin)',
        protect: true,
      },
    })
    .output(
      toEnvelopeSchema(
        z.object({
          soloSeats: z.array(sDto.passthrough()),
          premiumSeats: z.array(psDto.passthrough()),
        })
      )
    )
    .query(async ({ ctx }) => {
      const [allSoloSeats, allPremiumSeats] = await Promise.all([
        ctx.db
          .select()
          .from(soloSeats)
          .where(eq(soloSeats.tenantId, ctx.tenantId))
          .orderBy(asc(soloSeats.createdAt)),
        ctx.db
          .select()
          .from(premiumSeats)
          .where(eq(premiumSeats.tenantId, ctx.tenantId))
          .orderBy(asc(premiumSeats.createdAt)),
      ]);

      return toEnvelope({ soloSeats: allSoloSeats, premiumSeats: allPremiumSeats });
    }),
});
