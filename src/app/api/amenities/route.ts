import { auth, apiSuccess, withErrorHandler } from '@api/server';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { computeAmenityStatus } from '@entities/amenity';
import { getActiveAmenitiesCatalog } from '@entities/amenity/server';

export const maxDuration = 8;

export const GET = withErrorHandler(async (_request: Request) => {
  await auth.api.getSession({ headers: _request.headers });
  await assertModuleEnabled('bookings');

  const { tenantId } = await withTenant();
  const results = await getActiveAmenitiesCatalog(tenantId);

  const amenitiesWithStatus = results.map(amenity => computeAmenityStatus(amenity));

  return apiSuccess(amenitiesWithStatus);
});
