import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { db, maintenanceRequests, users, properties } from '@api/db';
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
import { eq, desc, and, sql, InferInsertModel } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';

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
 * @query status - Filter by SUBMITTED, IN_PROGRESS, COMPLETED, CANCELLED
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

  const { tenantId } = await withTenant();

  // Build query conditions
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql>)[] = [
    eq(maintenanceRequests.tenantId, tenantId),
  ];

  // Filter by user if not admin
  if (!canViewAll) {
    conditions.push(eq(maintenanceRequests.userId, authData.userId));
  }

  // Filter by status if provided
  if (status && status !== 'all') {
    conditions.push(
      eq(
        maintenanceRequests.status,
        status as (typeof maintenanceRequests.status.enumValues)[number]
      )
    );
  }

  // Filter by priority if provided
  if (priority && priority !== 'all') {
    conditions.push(
      eq(
        maintenanceRequests.priority,
        priority as (typeof maintenanceRequests.priority.enumValues)[number]
      )
    );
  }

  // Filter by category if provided
  if (category && category !== 'all') {
    conditions.push(eq(maintenanceRequests.category, category));
  }

  // Filter by date range
  if (dateFrom) {
    conditions.push(sql`${maintenanceRequests.createdAt} >= ${new Date(dateFrom)}`);
  }
  if (dateTo) {
    conditions.push(sql`${maintenanceRequests.createdAt} <= ${new Date(dateTo)}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Execute query with left joins to get user info and property address
  interface QueryResult {
    MaintenanceRequest: typeof maintenanceRequests.$inferSelect;
    user: typeof users.$inferSelect | null;
    property?: typeof properties.$inferSelect | null;
  }
  let results: QueryResult[];

  if (canViewAll) {
    // Admin view: join with properties to get address
    results = await db
      .select({
        MaintenanceRequest: maintenanceRequests,
        user: users,
        property: properties,
      })
      .from(maintenanceRequests)
      .leftJoin(users, eq(maintenanceRequests.userId, users.id))
      .leftJoin(properties, eq(maintenanceRequests.propertyId, properties.id))
      .where(whereClause)
      .orderBy(desc(maintenanceRequests.createdAt));
  } else {
    // Resident view: simple join
    results = await db
      .select({
        MaintenanceRequest: maintenanceRequests,
        user: users,
        property: sql<null>`null`,
      })
      .from(maintenanceRequests)
      .leftJoin(users, eq(maintenanceRequests.userId, users.id))
      .where(whereClause)
      .orderBy(desc(maintenanceRequests.createdAt));
  }

  // Transform results
  const transformed = results.map(row => {
    const mr = row.MaintenanceRequest;
    const u = row.user;
    const prop = row.property;

    // Get property address
    const address = prop ? { street: prop.street, unit: prop.unit } : null;

    return {
      id: mr.id,
      userId: mr.userId,
      propertyId: mr.propertyId,
      category: mr.category,
      priority: mr.priority,
      description: mr.description,
      status: mr.status,
      images: mr.images,
      assignedTo: mr.assignedTo,
      vendor: mr.vendor,
      scheduledDate: mr.scheduledDate,
      estimatedCost: mr.estimatedCost,
      actualCost: mr.actualCost,
      resolution: mr.resolution,
      completedAt: mr.completedAt,
      createdAt: mr.createdAt,
      updatedAt: mr.updatedAt,
      user: u
        ? {
            name: u.name,
            email: u.email,
            address: address,
          }
        : null,
    };
  });

  // Apply search filter in memory (for description search)
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
        r.category?.toLowerCase().includes(searchLower)
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

    const { category, priority, description } = validationResult.data;
    const userId = body.userId || authData.userId;
    const propertyId = body.propertyId || null;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Use Drizzle insert
    const now = new Date();
    const insertValues: InferInsertModel<typeof maintenanceRequests> = {
      id: crypto.randomUUID(),
      tenantId,
      userId,
      propertyId,
      category,
      priority,
      description,
      images: body.images || [],
      status: 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    };
    const insertResult = await db.insert(maintenanceRequests).values(insertValues).returning();

    const maintenanceRequest = insertResult[0];

    // Revalidate dashboard caches immediately when new request is created
    revalidateDashboard();

    return apiCreated(maintenanceRequest);
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/maintenance' }, 'Maintenance request creation error');
    return apiInternalError();
  }
}
