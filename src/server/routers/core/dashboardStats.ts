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

export const dashboardStatsRouter = router({
  // ============ DASHBOARD STATS ============

  /**
   * Get dashboard summary stats — tenant-scoped.
   * @tenant
   */
  getDashboardStats: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/dashboard/stats',
        tags: ['Identity'],
        summary: 'Get dashboard summary stats',
        protect: true,
      },
    })
    .output(
      toEnvelopeSchema(
        z.object({
          requests: z.number(),
          bookings: z.number(),
          messages: z.number(),
          notifications: z.number(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const [reqResult, bookingsResult, convResult, notifResult] = await Promise.all([
        ctx.db
          .select({ count: count() })
          .from(maintenanceRequests)
          .where(
            and(
              eq(maintenanceRequests.userId, ctx.userId),
              eq(maintenanceRequests.tenantId, ctx.tenantId)
            )
          ),
        ctx.db
          .select({ count: count() })
          .from(bookings)
          .where(and(eq(bookings.userId, ctx.userId), eq(bookings.tenantId, ctx.tenantId))),
        ctx.db
          .select({ count: count() })
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.userId, ctx.userId),
              eq(conversationParticipants.tenantId, ctx.tenantId)
            )
          ),
        ctx.db
          .select({ count: count() })
          .from(notifications)
          .where(
            and(eq(notifications.userId, ctx.userId), eq(notifications.tenantId, ctx.tenantId))
          ),
      ]);

      return toEnvelope({
        requests: reqResult[0]?.count ?? 0,
        bookings: bookingsResult[0]?.count ?? 0,
        messages: convResult[0]?.count ?? 0,
        notifications: notifResult[0]?.count ?? 0,
      });
    }),
});
