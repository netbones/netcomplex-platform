import {
  auth,
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiInternalError,
  apiValidationError,
  revalidateDashboard,
  db,
  emitEvent,
  users,
} from '@api/server';

import { hasPermission } from '@shared/lib';
import { maintenanceRequestSchema } from '@entities/maintenance';

import { apiLogger } from '@shared/lib';

import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import {
  listMaintenanceRequests,
  createMaintenanceRequest,
  toMaintenanceRequestViewList,
} from '@entities/maintenance/server';

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

  // Use Drizzle instead of Prisma
  const userResult = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult[0]?.role || 'RESIDENT',
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

    // Delegate to entity service for creation (includes ticket number generation)
    const [maintenanceRequest] = await createMaintenanceRequest({
      id: crypto.randomUUID(),
      tenantId,
      userId,
      propertyId,
      category,
      priority,
      description,
      images: body.images || [],
      preferredDate,
      preferredTime,
    });

    // Revalidate dashboard caches immediately when new request is created
    revalidateDashboard();

    emitEvent('maintenance.created', {
      tenantId,
      userId,
      requestId: maintenanceRequest.id,
      category,
    });

    return apiCreated(maintenanceRequest);
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/maintenance' }, 'Maintenance request creation error');
    return apiInternalError();
  }
}
