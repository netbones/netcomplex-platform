import { protectedProcedure, db, maintenanceRequests, bookings, now } from '@api/server';
import { TRPCError } from '@trpc/server';
import { eq, and, gte, lte, count } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';

const UrgencyLogger = createComponentLogger('MarketplaceUrgency');

export const urgencyProcedures = {
  getUrgencyLevels: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/urgency',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const today = now();
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      try {
        const [openMaintenanceResult, upcomingBookingsResult] = await Promise.all([
          db
            .select({ count: count() })
            .from(maintenanceRequests)
            .where(
              and(
                eq(maintenanceRequests.tenantId, tenantId),
                eq(maintenanceRequests.status, 'SUBMITTED'),
                eq(maintenanceRequests.userId, ctx.userId)
              )
            ),
          db
            .select({ count: count() })
            .from(bookings)
            .where(
              and(
                eq(bookings.tenantId, tenantId),
                gte(bookings.date, today),
                lte(bookings.date, sevenDaysFromNow)
              )
            ),
        ]);

        const extractCount = (result: { count: number }[]) => result[0]?.count ?? 0;

        const openMaintenance = extractCount(openMaintenanceResult);
        const upcomingBookings = extractCount(upcomingBookingsResult);

        return {
          commandBar: {
            openMaintenance,
            upcomingBookings,
          },
          domainBadges: {
            maintenance: openMaintenance,
            bookings: upcomingBookings,
            amenities: 0,
            'my-services': 0,
            events: 0,
          },
        };
      } catch (error) {
        UrgencyLogger.error(
          { operation: 'getUrgencyLevels' },
          'Failed to get urgency counts',
          error
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get urgency levels',
        });
      }
    }),
};
