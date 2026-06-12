import {
  auth,
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiInternalError,
  apiValidationError,
  revalidateDashboard,
  db,
  users,
} from '@api/server';

import { hasPermission } from '@entities/tenant';
import { maintenanceRequestSchema, toMaintenanceRequestDTO } from '@api/shared';

import { apiLogger } from '@shared/lib';

import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';
import * as maintenanceService from '@entities/maintenance';

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
  const results = await maintenanceService.listMaintenanceRequests({
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

  // Community scope: strip PII and internal fields. Anyone in the tenant can
  // see the request flow (ticket number, category, priority, status, dates)
  // but not who submitted it, descriptions, or assignment details.
  if (scope === 'community') {
    type CommunityMaintenanceLog = {
      id: string;
      ticketNumber: string | null | undefined;
      category: string;
      priority: string;
      status: string;
      createdAt: string;
      updatedAt: string | null | undefined;
    };
    const communityOutput: CommunityMaintenanceLog[] = transformed.map(r => ({
      id: r.id,
      ticketNumber: r.ticketNumber,
      category: r.category,
      priority: r.priority,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    return apiSuccess(communityOutput);
  }

  // Apply search filter in memory (for description/ticketNumber search).
  // Community scope is handled above and never reaches this branch, so the
  // user/address fields are guaranteed to exist on `r` here.
  let filteredResults = transformed;
  if (search && canViewAll) {
    const searchLower = search.toLowerCase();
    filteredResults = transformed.filter(r => {
      const user = r.user;
      const address = user?.address;
      return (
        r.description?.toLowerCase().includes(searchLower) ||
        user?.name?.toLowerCase().includes(searchLower) ||
        user?.email?.toLowerCase().includes(searchLower) ||
        address?.street?.toLowerCase().includes(searchLower) ||
        address?.unit?.toLowerCase().includes(searchLower) ||
        r.category?.toLowerCase().includes(searchLower) ||
        r.ticketNumber?.toLowerCase().includes(searchLower)
      );
    });
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
