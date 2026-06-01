import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { maintenanceRequestSchema } from '@api/schemas';
import {
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiInternalError,
  apiValidationError,
} from '@api/api-response';
import { revalidateDashboard } from '@api/revalidation';
import { apiLogger } from '@shared/lib';
import { db, users } from '@api/db';
import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { toMaintenanceRequestDTO } from '@api/dto/maintenance';
import * as maintenanceService from '@entities/maintenance/services';

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
  const scope: 'mine' | 'all' | null =
    scopeParam === 'mine' ? 'mine' : scopeParam === 'all' ? 'all' : null;

  const { tenantId } = await withTenant();

  // Delegate to entity service for query building and execution
  const results = await maintenanceService.listMaintenanceRequests({
    tenantId,
    userId: authData.userId,
    canViewAll,
    scope,
    status,
    priority,
    category,
    dateFrom,
    dateTo,
  });

  // Transform results using DTO + team/provider details
  const transformed = results.map(row => {
    const mr = row.MaintenanceRequest;
    const u = row.user;
    const prop = row.property;
    const team = row.team;
    const provider = row.provider;

    const address = prop ? { street: prop.street, unit: prop.unit } : null;

    return {
      ...toMaintenanceRequestDTO(mr),
      user: u
        ? {
            name: u.name,
            email: u.email,
            address: address,
          }
        : null,
      assignedTeam: team ? { id: team.id, name: team.name, trade: team.trade } : null,
      assignedProvider: provider
        ? { id: provider.id, companyName: provider.companyName, trade: provider.trade }
        : null,
    };
  });

  // Apply search filter in memory (for description/ticketNumber search)
  let filteredResults = transformed;
  if (search && canViewAll) {
    const searchLower = search.toLowerCase();
    filteredResults = transformed.filter(
      r =>
        r.description?.toLowerCase().includes(searchLower) ||
        r.user?.name?.toLowerCase().includes(searchLower) ||
        r.user?.email?.toLowerCase().includes(searchLower) ||
        r.user?.address?.street?.toLowerCase().includes(searchLower) ||
        r.user?.address?.unit?.toLowerCase().includes(searchLower) ||
        r.category?.toLowerCase().includes(searchLower) ||
        r.ticketNumber?.toLowerCase().includes(searchLower)
    );
  }

  return apiSuccess(filteredResults);
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
    const [maintenanceRequest] = await maintenanceService.createMaintenanceRequest({
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

    return apiCreated(maintenanceRequest);
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/maintenance' }, 'Maintenance request creation error');
    return apiInternalError();
  }
}
