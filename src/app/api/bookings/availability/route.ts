import { auth, apiError, apiInternalError, apiSuccess, apiUnauthorized } from '@api/server';

import { assertModuleEnabled } from '@entities/tenant/server';
import { withTenant } from '@entities/tenant/server';
import { getBookedSlots } from '@entities/booking/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const featureCheck = await assertModuleEnabled('bookings');
    if (featureCheck) return featureCheck;

    const { searchParams } = new URL(request.url);
    const facility = searchParams.get('facility');
    const date = searchParams.get('date');

    if (!facility) {
      return apiError('VALIDATION_ERROR', 'Facility parameter is required', 400);
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return apiError('VALIDATION_ERROR', 'Date must be YYYY-MM-DD format', 400);
    }

    const { tenantId } = await withTenant();

    const bookedSlots = await getBookedSlots({
      tenantId,
      facility,
      date: new Date(date),
    });

    return apiSuccess({ facility, date, bookedSlots });
  } catch (error) {
    logError(
      { component: 'booking-availability-api', operation: 'GET' },
      'Booking availability fetch error',
      error
    );
    return apiInternalError();
  }
}
