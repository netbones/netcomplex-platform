import {
  auth,
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiInternalError,
  apiValidationError,
  apiForbidden,
  revalidateDashboard,
  db,
  emitEvent,
  notifications,
  residentDelegations,
} from '@api/server';

import { hasPermission } from '@shared/lib';
import { maintenanceRequestSchema } from '@entities/maintenance';

import { apiLogger } from '@shared/lib';

import { eq, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import {
  listMaintenanceRequests,
  createMaintenanceRequest,
  toMaintenanceRequestViewList,
  resolveRoutingType,
} from '@entities/maintenance/server';
import { createId } from '@shared/lib/id';

// Limit execution time to 8 seconds to control costs
export const maxDuration = 8;

/**
 * Retrieves session and role from the request for API routes.
 * @param request - Incoming HTTP request
 * @returns Session data with user ID and role, or null if not authenticated
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  return {
    session,
    userId: session.user.id,
    role: (session.user as { role?: string }).role || 'RESIDENT',
  };
}

/**
 * GET /api/maintenance - List maintenance requests
 * Admins see all requests, residents see only their own
 * @query status - Filter by any of the 7 statuses
 * @query priority - Comma-separated priorities (e.g., "EMERGENCY,HIGH")
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  const canViewAll = hasPermission(authData.role, 'requests');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const scopeParam = searchParams.get('scope');
  // 'mine' = user-scoped (own requests only)
  // 'all' = role-gated view-all (requires canViewAll permission)
  // 'community' = tenant-wide basic log, no PII, no assignment details (open to all authenticated users)
  const scope: 'mine' | 'all' | 'community' | null =
    scopeParam === 'mine'
      ? 'mine'
      : scopeParam === 'all'
        ? 'all'
        : scopeParam === 'community'
          ? 'community'
          : null;

  const { tenantId } = await withTenant();

  // Delegate to entity service for query building and execution
  const results = await listMaintenanceRequests({
    tenantId,
    userId: authData.userId,
    canViewAll: canViewAll || scope === 'community',
    scope: scope === 'community' ? 'all' : scope,
    status,
    priority,
    category,
    dateFrom,
    dateTo,
  });

  // Transform and scope-filter via service function
  const output = toMaintenanceRequestViewList(
    results,
    scope === 'community' ? 'community' : canViewAll ? 'all' : 'mine',
    canViewAll ? search : null
  );

  return apiSuccess(output);
}

/**
 * POST /api/maintenance - Create a new maintenance request
 * @body userId - Optional user ID (defaults to authenticated user)
 * @body propertyId - Optional property ID
 * @body category - Issue category (PLUMBING, ELECTRICAL, etc.)
 * @body priority - Priority level (LOW, MEDIUM, HIGH, EMERGENCY)
 * @body description - Detailed description
 * @body images - Optional array of image URLs
 * @body preferredDate - Optional preferred service date (YYYY-MM-DD)
 * @body preferredTime - Optional preferred service time (HH:MM)
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = maintenanceRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return apiValidationError(validationResult.error.issues);
    }

    const { category, priority, description, preferredDate, preferredTime } = validationResult.data;
    const userId = body.userId || authData.userId;
    const propertyId = body.propertyId || null;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Resolve routing: HOA or landlord, based on property occupancy
    let routingCtx = {
      routingType: 'HOA',
      landlordId: null as string | null,
      reason: 'no property',
    };

    if (propertyId) {
      routingCtx = await resolveRoutingType(propertyId, tenantId);
    }

    // If LANDLORD routing: verify caller has permission to raise a request
    if (routingCtx.routingType === 'LANDLORD') {
      const isOwner = routingCtx.landlordId === authData.userId;
      const isAdmin = ['ADMIN', 'BOARD'].includes(authData.role ?? '');

      if (!isOwner && !isAdmin) {
        // Check ResidentDelegation — renter must have maintenance:create scope
        const [renterGrant] = await db
          .select({ id: residentDelegations.id })
          .from(residentDelegations)
          .where(
            and(
              eq(residentDelegations.propertyId, propertyId!),
              eq(residentDelegations.tenantId, tenantId),
              isNull(residentDelegations.revokedAt),
              // Must be linked to a profile the current user holds
              eq(residentDelegations.profileId, authData.userId)
            )
          )
          .limit(1);

        // Check if the grant includes maintenance:create scope
        const hasScope = renterGrant
          ? (
              await db
                .select({ scopes: residentDelegations.scopes })
                .from(residentDelegations)
                .where(eq(residentDelegations.id, renterGrant.id))
                .limit(1)
            )[0]?.scopes?.includes('maintenance:create')
          : false;

        if (!hasScope) {
          return apiForbidden(
            'You do not have permission to raise maintenance requests on this property. ' +
              'The property owner must grant you this right.'
          );
        }
      }
    }

    // Delegate to entity service for creation (includes ticket number generation)
    const [maintenanceRequest] = await createMaintenanceRequest({
      id: createId(),
      tenantId,
      userId,
      propertyId,
      category,
      priority,
      description,
      images: body.images || [],
      preferredDate,
      preferredTime,
      routingType: routingCtx.routingType as 'HOA' | 'LANDLORD',
      landlordId: routingCtx.landlordId,
    });

    // Revalidate dashboard caches immediately when new request is created
    revalidateDashboard();

    // Notify the right party
    if (routingCtx.routingType === 'LANDLORD' && routingCtx.landlordId) {
      // Notify the landlord
      await db.insert(notifications).values({
        id: createId(),
        tenantId,
        userId: routingCtx.landlordId,
        senderId: authData.userId,
        title: 'Maintenance request raised on your property',
        message:
          `A maintenance request (${category}) has been submitted for ` +
          `${propertyId}. Please review and assign a contractor.`,
        type: 'info',
        link: `/dashboard/services/maintenance/${maintenanceRequest.id}`,
        payload: {
          requestId: maintenanceRequest.id,
          routingType: 'LANDLORD',
          category,
          priority,
        },
      });
    }

    emitEvent('maintenance.created', {
      tenantId,
      userId,
      requestId: maintenanceRequest.id,
      category,
      routingType: routingCtx.routingType as 'HOA' | 'LANDLORD',
    });

    return apiCreated(maintenanceRequest);
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/maintenance' }, 'Maintenance request creation error');
    return apiInternalError();
  }
}
