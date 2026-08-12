import { db, apiSuccess, apiError, withErrorHandler } from '@api/server';
import { bookings } from '@/db/schema/bookings';
import { eq, and } from 'drizzle-orm';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';

export const maxDuration = 8;

export const GET = withErrorHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    await assertModuleEnabled('bookings');
    const { id: amenityId } = await params;
    const { tenantId } = await withTenant();

    const { searchParams } = new URL(_request.url);
    const dateStr = searchParams.get('date');

    if (!dateStr) {
      return apiError('MISSING_PARAM', 'Missing date parameter', 400);
    }

    const dateObj = new Date(dateStr);

    const results = await db
      .select({
        startTime: bookings.startTime,
        endTime: bookings.endTime,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          eq(bookings.amenityId, amenityId),
          eq(bookings.date, dateObj),
          eq(bookings.status, 'CONFIRMED')
        )
      );

    return apiSuccess(results);
  }
);
