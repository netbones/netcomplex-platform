import { NextRequest } from 'next/server';
import { db, settings, apiSuccess, apiInternalError, apiForbidden } from '@api/server';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { getSessionAndRole } from '@api/server';
import { isAdmin } from '@shared/lib';
import { getTenantFacilities } from '@entities/booking/server';
import { createComponentLogger } from '@shared/lib';
import type { TenantFacility } from '@entities/booking';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 8;

const log = createComponentLogger('admin-bookings-api');

export async function GET() {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole || !isAdmin(sessionRole.role)) return apiForbidden();

    const { tenantId } = await withTenant();
    const facilities = await getTenantFacilities(tenantId);
    return apiSuccess(facilities);
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get booking facilities', error);
    return apiInternalError(String(error));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole || !isAdmin(sessionRole.role)) return apiForbidden();

    const { tenantId } = await withTenant();
    const body = (await request.json()) as TenantFacility[];

    if (!Array.isArray(body)) {
      return apiSuccess({ error: 'Expected an array of facilities' }, undefined, 400);
    }

    for (const f of body) {
      if (!f.value || !f.label) {
        return apiSuccess({ error: 'Each facility must have a value and label' }, undefined, 400);
      }
    }

    const value = JSON.stringify(body);
    const existing = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, 'booking_facilities')))
      .limit(1);

    if (existing.length > 0) {
      await db.update(settings).set({ value }).where(eq(settings.id, existing[0].id));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        tenantId,
        key: 'booking_facilities',
        value,
      });
    }

    return apiSuccess({ success: true });
  } catch (error) {
    log.error({ operation: 'PUT' }, 'Failed to update booking facilities', error);
    return apiInternalError(String(error));
  }
}
