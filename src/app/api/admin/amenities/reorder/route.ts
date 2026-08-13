import { NextRequest } from 'next/server';
import { db, apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { amenities } from '@/db/schema/amenities';
import { amenityReorderSchema } from '@entities/amenity';
import { and, eq, inArray, isNull } from 'drizzle-orm';

export const maxDuration = 8;

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('bookings');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const body = await request.json();
  const parsed = amenityReorderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid reorder payload', 400, parsed.error.flatten());
  }

  const { orderedIds } = parsed.data;

  const existing = await db
    .select({ id: amenities.id })
    .from(amenities)
    .where(
      and(
        eq(amenities.tenantId, tenantId),
        isNull(amenities.deletedAt),
        inArray(amenities.id, orderedIds)
      )
    );

  if (existing.length !== orderedIds.length) {
    return apiError('VALIDATION_ERROR', 'One or more amenity ids are invalid for this tenant', 400);
  }

  const now = new Date();
  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(amenities)
        .set({ sortOrder: index, updatedAt: now })
        .where(and(eq(amenities.id, id), eq(amenities.tenantId, tenantId)))
    )
  );

  return apiSuccess({ success: true });
});
