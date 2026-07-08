import { db, households, notDeleted, properties } from '@api/server';
import { eq, and } from 'drizzle-orm';
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
  // Query property to get ownerId
  const [property] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.tenantId, tenantId)))
    .limit(1);

  if (!property) {
    return { routingType: 'HOA', landlordId: null, reason: 'property not found' };
  }

  // Query the most recent active household for this property
  const [activeHousehold] = await db
    .select({ occupancyType: households.occupancyType })
    .from(households)
    .where(
      and(
        eq(households.propertyId, propertyId),
        eq(households.status, 'ACTIVE'),
        notDeleted(households)
      )
    )
    .orderBy(households.createdAt)
    .limit(1);

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
