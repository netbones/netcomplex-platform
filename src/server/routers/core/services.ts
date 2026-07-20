import {
  tenantProcedure,
  router,
  toEnvelope,
  db,
  maintenanceRequests,
  bookings,
  now,
} from '@api/server';
import { count, eq, and, gte, lte } from 'drizzle-orm';

export const servicesRouter = router({
  getUrgency: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/services/urgency',
        tags: ['Services'],
        summary: 'Get services urgency counts',
        protect: true,
      },
    })
    .query(async ({ ctx }) => {
      const { userId, tenantId } = ctx;
      const today = now();
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [openMaintenanceResult, upcomingBookingsResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(maintenanceRequests)
          .where(
            and(
              eq(maintenanceRequests.tenantId, tenantId),
              eq(maintenanceRequests.status, 'SUBMITTED'),
              eq(maintenanceRequests.userId, userId)
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

      return toEnvelope({
        commandBar: { openMaintenance, upcomingBookings },
        domainBadges: {
          maintenance: openMaintenance,
          bookings: upcomingBookings,
          amenities: 0,
          'my-services': 0,
          events: 0,
        },
      });
    }),
});
