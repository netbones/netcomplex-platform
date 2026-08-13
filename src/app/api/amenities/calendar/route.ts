import { NextRequest } from 'next/server';
import { apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { getCalendarMonth } from '@entities/amenity/server';

export const maxDuration = 8;

/**
 * GET /api/amenities/calendar?year=2026&month=8&amenityId=optional
 * Month-grid density dots for bookable amenities (confirmed + waitlisted).
 * Privacy: never returns other residents' identities — only amenity ids per day.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('bookings');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month')); // 1–12
  const amenityFilter = searchParams.get('amenityId') ?? '';

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return apiError('VALIDATION_ERROR', 'year and month (1–12) are required', 400);
  }

  const payload = await getCalendarMonth(tenantId, year, month, amenityFilter);

  return apiSuccess({
    year: payload.year,
    month: payload.month,
    amenities: payload.amenities.map(a => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      sortOrder: a.sortOrder,
      colorIndex: a.colorIndex,
      colorHex: a.calendarColor.hex,
      colorKey: a.calendarColor.key,
      hoursOpen: a.hoursOpen,
      hoursClose: a.hoursClose,
      slotDurationMins: a.slotDurationMins,
      photoUrl: a.photoUrl,
      rulesText: a.rulesText,
      bookable: a.bookable,
      maxOccupancy: a.maxOccupancy,
      waitlistEnabled: a.waitlistEnabled,
      contactEnabled: a.contactEnabled,
      contactPhone: a.contactPhone,
      description: a.description,
      active: a.active,
      tenantId: a.tenantId,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      deletedAt: a.deletedAt,
    })),
    days: payload.days,
    dotCap: payload.dotCap,
  });
});
