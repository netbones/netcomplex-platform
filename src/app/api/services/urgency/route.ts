import {
  apiSuccess,
  apiInternalError,
  apiUnauthorized,
  db,
  maintenanceRequests,
  bookings,
  auth,
  now,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';

import { count, eq, and, gte, lte, notInArray } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';
import { headers } from 'next/headers';

export const maxDuration = 8;

const log = createComponentLogger('services-urgency-api');

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { tenantId } = await withTenant();
    const userId = session.user.id;

    const today = now();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [openMaintenanceResult, upcomingBookingsResult, overdueMaintenanceResult] =
      await Promise.all([
        // Open maintenance requests (SUBMITTED status)
        // Always user-scoped — the badge represents the user's own open requests
        // on the user-facing services dashboard, regardless of role
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

        // Upcoming bookings (next 7 days)
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

        // Overdue maintenance (scheduledDate past, not completed/cancelled)
        db
          .select({ count: count() })
          .from(maintenanceRequests)
          .where(
            and(
              eq(maintenanceRequests.tenantId, tenantId),
              lte(maintenanceRequests.scheduledDate, today),
              notInArray(maintenanceRequests.status, ['COMPLETED', 'CANCELLED'])
            )
          ),
      ]);

    const extractCount = (result: { count: number }[]) => result[0]?.count ?? 0;

    const openMaintenance = extractCount(openMaintenanceResult);
    const upcomingBookings = extractCount(upcomingBookingsResult);
    const overdueMaintenance = extractCount(overdueMaintenanceResult);

    return apiSuccess({
      commandBar: {
        openMaintenance,
        upcomingBookings,
      },
      domainBadges: {
        maintenance: openMaintenance,
        bookings: upcomingBookings,
        amenities: 0, // placeholder (future feature flag)
        'my-services': 0, // placeholder
        events: 0, // placeholder
      },
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get services urgency counts', error);
    return apiInternalError(String(error));
  }
}
