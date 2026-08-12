import { auth, db, apiSuccess, apiInternalError, withErrorHandler } from '@api/server';
import { amenities } from '@/db/schema/amenities';
import { eq, and, asc } from 'drizzle-orm';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { computeAmenityStatus } from '@entities/amenity';

export const maxDuration = 8;

export const GET = withErrorHandler(async (_request: Request) => {
  await auth.api.getSession({ headers: _request.headers });
  await assertModuleEnabled('bookings');

  const { tenantId } = await withTenant();

  const results = await db
    .select()
    .from(amenities)
    .where(and(eq(amenities.tenantId, tenantId), eq(amenities.active, true)))
    .orderBy(asc(amenities.sortOrder));

  const amenitiesWithStatus = results.map(amenity =>
    computeAmenityStatus({
      ...amenity,
      createdAt: amenity.createdAt ?? new Date(),
      updatedAt: amenity.updatedAt ?? new Date(),
      deletedAt: amenity.deletedAt ?? null,
    })
  );

  return apiSuccess(amenitiesWithStatus);
});
