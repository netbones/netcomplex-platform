import { z } from 'zod';
import {
  bookings,
  conversationParticipants,
  maintenanceRequests,
  notifications,
  router,
  tenantProcedure,
  toEnvelope,
  toEnvelopeSchema,
} from '@api/server';

import { eq, and, count } from 'drizzle-orm';

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
