import { apiSuccess, apiError, withErrorHandler } from '@api/server';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { getAmenityBookingsForDate } from '@entities/amenity/server';

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

    const results = await getAmenityBookingsForDate(tenantId, amenityId, dateStr);

    return apiSuccess(results);
  }
);
