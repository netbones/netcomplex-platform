import { db, properties, apiSuccess, apiNotFound, withErrorHandler } from '@api/server';
import { and, eq, isNull } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * GET /api/join-requests/property?tenantId=<id>&propertyNumber=<unit>
 * Public, unauthenticated exact-match property lookup for the join-request
 * wizard. Returns the matching non-deleted Property for the given tenant and
 * unit number, or 404 when no exact match exists (per ADVISORY-038 G2).
 */
export const GET = withErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId');
  const propertyNumber = url.searchParams.get('propertyNumber')?.trim();

  if (!tenantId || !propertyNumber) {
    return apiNotFound('Tenant and property number are required');
  }

  const [property] = await db
    .select({
      id: properties.id,
      tenantId: properties.tenantId,
      street: properties.street,
      unit: properties.unit,
    })
    .from(properties)
    .where(
      and(
        eq(properties.tenantId, tenantId),
        eq(properties.unit, propertyNumber),
        isNull(properties.deletedAt)
      )
    )
    .limit(1);

  if (!property) {
    return apiNotFound('No matching property found');
  }

  return apiSuccess(property);
});
