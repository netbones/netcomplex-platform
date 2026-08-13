import { NextRequest } from 'next/server';
import { apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { parseDateKey } from '@entities/amenity';
import { getCalendarDayAgenda } from '@entities/amenity/server';

export const maxDuration = 8;

/**
 * GET /api/amenities/calendar/day?date=YYYY-MM-DD&amenityId=optional
 * Day agenda: chronological slots across bookable amenities.
 * Privacy: other residents' bookings are "booked" only — never name/unit/userId.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('bookings');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  const amenityFilter = searchParams.get('amenityId') ?? '';

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return apiError('VALIDATION_ERROR', 'date (YYYY-MM-DD) is required', 400);
  }

  const dayDate = parseDateKey(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dayDate < today) {
    return apiError('VALIDATION_ERROR', 'Past days are not available on this calendar', 400);
  }

  const slots = await getCalendarDayAgenda(tenantId, auth.data.userId, dateStr, amenityFilter);

  return apiSuccess({
    date: dateStr,
    slots,
    viewerUserId: undefined,
  });
});
