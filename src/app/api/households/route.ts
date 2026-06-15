import { NextRequest } from 'next/server';
import {
  auth,
  db,
  households,
  properties,
  standardSeats,
  profiles,
  users,
  apiError,
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
} from '@api/server';

import { eq, and, count, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { logError } from '@shared/lib';

export const maxDuration = 8;

/**
 * GET /api/households - List all households with occupant counts
 */
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const role = user?.role || 'RESIDENT';
    const canManageHouseholds = hasPermission(role, 'households');

    if (!canManageHouseholds) {
      return apiForbidden();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    // Get total count
    const totalResult = await db
      .select({ total: count() })
      .from(households)
      .where(eq(households.tenantId, tenantId));

    const total = totalResult[0]?.total || 0;

    // Get households with property info
    const householdList = await db
      .select({
        id: households.id,
        propertyId: households.propertyId,
        street: properties.street,
        unit: properties.unit,
        homeImage: properties.homeImage,
        platformAddress: properties.platformAddress,
        status: households.status,
        createdAt: households.createdAt,
      })
      .from(households)
      .innerJoin(properties, eq(households.propertyId, properties.id))
      .where(eq(households.tenantId, tenantId))
      .orderBy(desc(households.createdAt))
      .limit(limit)
      .offset(skip);

    // Get occupant counts for each household
    const householdsWithOccupants = await Promise.all(
      householdList.map(async household => {
        // Count standard seats
        const [seatCount] = await db
          .select({ count: count() })
          .from(standardSeats)
          .where(
            and(
              eq(standardSeats.propertyId, household.propertyId),
              eq(standardSeats.tenantId, tenantId)
            )
          );

        // Count profiles
        const [profileCount] = await db
          .select({ count: count() })
          .from(profiles)
          .where(and(eq(profiles.householdId, household.id), eq(profiles.tenantId, tenantId)));

        // Get primary owner
        const [primaryOwner] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(standardSeats)
          .innerJoin(users, eq(standardSeats.userId, users.id))
          .where(
            and(
              eq(standardSeats.propertyId, household.propertyId),
              eq(standardSeats.isPrimaryOwner, true),
              eq(standardSeats.tenantId, tenantId)
            )
          )
          .limit(1);

        return {
          ...household,
          occupantCount: (seatCount?.count || 0) + (profileCount?.count || 0),
          primaryOwner: primaryOwner || null,
        };
      })
    );

    // Filter by search if provided
    const filtered = search
      ? householdsWithOccupants.filter(
          h =>
            h.street.toLowerCase().includes(search.toLowerCase()) ||
            h.unit.toLowerCase().includes(search.toLowerCase()) ||
            h.primaryOwner?.name?.toLowerCase().includes(search.toLowerCase())
        )
      : householdsWithOccupants;

    return apiSuccess({
      households: filtered,
      total: search ? filtered.length : total,
      page,
      limit,
    });
  } catch (error) {
    logError({ component: 'households-api', operation: 'LIST' }, 'Error listing households', error);
    return apiInternalError();
  }
}
