import { db } from '@api/server';
import type { MaintenanceRoutingContext } from './types';

/**
 * Resolve where a maintenance request should route, based on the
 * property's active Household occupancy type.
 *
 * Rules:
 *   RENTAL + known owner → LANDLORD (owner receives notification, handles request)
 *   OWNER_OCCUPIED        → HOA (owner is also resident; HOA manages)
 *   VACANT                → HOA (no tenant; HOA manages)
 *   No household found    → HOA (safe default)
 *   RENTAL + no owner     → HOA (cannot route to unknown landlord)
 */
export async function resolveRoutingType(
  propertyId: string,
  tenantId: string
): Promise<MaintenanceRoutingContext> {
  const property = await db.property.findFirst({
    where: { id: propertyId, tenantId },
    select: {
      ownerId: true,
      households: {
        where: { status: 'ACTIVE', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { occupancyType: true },
      },
    },
  });

  if (!property) {
    return { routingType: 'HOA', landlordId: null, reason: 'property not found' };
  }

  const activeHousehold = property.households[0];

  if (!activeHousehold) {
    return { routingType: 'HOA', landlordId: null, reason: 'no active household' };
  }

  if (activeHousehold.occupancyType === 'RENTAL' && property.ownerId) {
    return {
      routingType: 'LANDLORD',
      landlordId: property.ownerId,
      reason: 'rental property with known owner',
    };
  }

  return {
    routingType: 'HOA',
    landlordId: null,
    reason: `occupancy type: ${activeHousehold.occupancyType}`,
  };
}
