import { NextRequest } from 'next/server';
import { db, apiSuccess, apiError, apiInternalError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { amenities } from '@/db/schema/amenities';
import { bookings } from '@/db/schema/bookings';
import { amenityAdminSchema, toAmenityColumns } from '@entities/amenity';
import { createComponentLogger } from '@shared/lib';
import { and, count, eq, isNull } from 'drizzle-orm';

export const maxDuration = 8;

const log = createComponentLogger('admin-amenities-id-api');

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function loadAmenity(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(amenities)
    .where(and(eq(amenities.id, id), eq(amenities.tenantId, tenantId), isNull(amenities.deletedAt)))
    .limit(1);
  return row ?? null;
}

async function bookingCountFor(tenantId: string, amenityId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.amenityId, amenityId),
        isNull(bookings.deletedAt)
      )
    );
  return row?.n ?? 0;
}

export const GET = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('bookings');
  if (moduleGate) return moduleGate;

  const { id } = await context.params;
  const { tenantId } = await withTenant();
  const row = await loadAmenity(tenantId, id);
  if (!row) return apiError('NOT_FOUND', 'Amenity not found', 404);

  const bookingCount = await bookingCountFor(tenantId, id);
  return apiSuccess({ ...row, bookingCount });
});

export const PATCH = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('bookings');
  if (moduleGate) return moduleGate;

  const { id } = await context.params;
  const { tenantId } = await withTenant();
  const existing = await loadAmenity(tenantId, id);
  if (!existing) return apiError('NOT_FOUND', 'Amenity not found', 404);

  const body = await request.json();

  // Quick toggle payloads: { active: boolean } only
  if (
    body &&
    typeof body === 'object' &&
    Object.keys(body).length === 1 &&
    typeof body.active === 'boolean'
  ) {
    const now = new Date();
    await db
      .update(amenities)
      .set({ active: body.active, updatedAt: now })
      .where(and(eq(amenities.id, id), eq(amenities.tenantId, tenantId)));
    const updated = await loadAmenity(tenantId, id);
    return apiSuccess(updated);
  }

  const parsed = amenityAdminSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid amenity payload', 400, parsed.error.flatten());
  }

  const cols = toAmenityColumns(parsed.data);
  const now = new Date();

  try {
    await db
      .update(amenities)
      .set({ ...cols, updatedAt: now })
      .where(and(eq(amenities.id, id), eq(amenities.tenantId, tenantId)));
  } catch (error) {
    log.error({ operation: 'PATCH', id }, 'Failed to update amenity', error);
    return apiInternalError('Failed to update amenity');
  }

  const updated = await loadAmenity(tenantId, id);
  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('bookings');
  if (moduleGate) return moduleGate;

  const { id } = await context.params;
  const { tenantId } = await withTenant();
  const existing = await loadAmenity(tenantId, id);
  if (!existing) return apiError('NOT_FOUND', 'Amenity not found', 404);

  const bookingCount = await bookingCountFor(tenantId, id);
  if (bookingCount > 0) {
    return apiError(
      'CONFLICT',
      'Cannot delete an amenity with existing bookings. Deactivate it instead.',
      409,
      { bookingCount }
    );
  }

  await db.delete(amenities).where(and(eq(amenities.id, id), eq(amenities.tenantId, tenantId)));

  return apiSuccess({ success: true });
});
