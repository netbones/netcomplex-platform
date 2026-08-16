import {
  db,
  propertyJoinRequests,
  properties,
  vehicles,
  apiSuccess,
  apiForbidden,
  withErrorHandler,
} from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { and, desc, eq, inArray } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * GET /api/admin/join-requests
 * List PropertyJoinRequest rows for the current tenant, PENDING first.
 * Requires content permission (admin/board/committee).
 */
export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request, { permission: 'content' });
  if (!auth.success) return auth.response;

  if (!hasPermission(auth.data.role, 'content')) {
    return apiForbidden('Insufficient permissions');
  }

  const { tenantId } = await withTenant();

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'PENDING';

  const conditions = [eq(propertyJoinRequests.tenantId, tenantId)];
  if (status !== 'ALL') {
    conditions.push(
      eq(propertyJoinRequests.status, status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN')
    );
  }

  const rows = await db
    .select({
      id: propertyJoinRequests.id,
      tenantId: propertyJoinRequests.tenantId,
      propertyId: propertyJoinRequests.propertyId,
      propertyNumberRaw: propertyJoinRequests.propertyNumberRaw,
      relationshipType: propertyJoinRequests.relationshipType,
      requestedName: propertyJoinRequests.requestedName,
      requestedSurname: propertyJoinRequests.requestedSurname,
      requestedEmail: propertyJoinRequests.requestedEmail,
      requestedPhone: propertyJoinRequests.requestedPhone,
      rulesAcceptedAt: propertyJoinRequests.rulesAcceptedAt,
      status: propertyJoinRequests.status,
      reviewedByUserId: propertyJoinRequests.reviewedByUserId,
      reviewedAt: propertyJoinRequests.reviewedAt,
      rejectionReason: propertyJoinRequests.rejectionReason,
      resultingInvitationId: propertyJoinRequests.resultingInvitationId,
      createdAt: propertyJoinRequests.createdAt,
    })
    .from(propertyJoinRequests)
    .where(and(...conditions))
    .orderBy(desc(propertyJoinRequests.createdAt));

  const ids = rows.map(r => r.id);
  const vehicleRows =
    ids.length === 0
      ? []
      : await db
          .select({
            id: vehicles.id,
            joinRequestId: vehicles.joinRequestId,
            make: vehicles.make,
            model: vehicles.model,
            color: vehicles.color,
            registration: vehicles.registration,
          })
          .from(vehicles)
          .where(inArray(vehicles.joinRequestId, ids));

  const vehiclesByRequest = new Map<string, typeof vehicleRows>();
  for (const v of vehicleRows) {
    if (!v.joinRequestId) continue;
    const list = vehiclesByRequest.get(v.joinRequestId) ?? [];
    list.push(v);
    vehiclesByRequest.set(v.joinRequestId, list);
  }

  const propertyIds = rows.map(r => r.propertyId).filter(Boolean) as string[];
  const propertyRows =
    propertyIds.length === 0
      ? []
      : await db
          .select({ id: properties.id, street: properties.street, unit: properties.unit })
          .from(properties)
          .where(inArray(properties.id, propertyIds));

  const propertyById = new Map(propertyRows.map(p => [p.id, p]));

  return apiSuccess({
    requests: rows.map(r => ({
      ...r,
      property: r.propertyId ? (propertyById.get(r.propertyId) ?? null) : null,
      vehicles: vehiclesByRequest.get(r.id) ?? [],
    })),
  });
});
