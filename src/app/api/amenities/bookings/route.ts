import { requireAuth } from '@/shared/api/auth-utils';
import { apiSuccess, withErrorHandler } from '@api/server';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { getUserAmenityBookings } from '@entities/amenity/server';

export const maxDuration = 8;

/**
 * GET /api/amenities/bookings
 * Lists the authenticated resident's bookings, joined with amenity details.
 * Only returns rows that reference an amenity (amenityId is set).
 */
export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;
  const featureCheck = await assertModuleEnabled('bookings');
  if (featureCheck) return featureCheck;

  const { tenantId } = await withTenant();
  const rows = await getUserAmenityBookings(tenantId, auth.data.userId);

  return apiSuccess(rows);
});
