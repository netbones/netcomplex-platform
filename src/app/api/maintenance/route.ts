import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { maintenanceRequestSchema } from '@/lib/schemas';
import { revalidateDashboard } from '@/lib/revalidation';
import { apiLogger } from '@/lib/logger';
// Import directly from drizzle schema files
import { maintenanceRequests } from '../../../../prisma/drizzle/maintenance-requests';
import { users } from '../../../../prisma/drizzle/users';
import { standardSeats } from '../../../../prisma/drizzle/standard-seats';
import { households } from '../../../../prisma/drizzle/households';
import { eq, desc, and, sql } from 'drizzle-orm';

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  // Build query conditions
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql>)[] = [];

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

  // Execute query with left joins to get user info and household address
  interface QueryResult {
    MaintenanceRequest: typeof maintenanceRequests.$inferSelect;
    user: typeof users.$inferSelect | null;
    standardSeat: typeof standardSeats.$inferSelect | null;
    household: typeof households.$inferSelect | null;
  }
  let requests: QueryResult[];
  if (canViewAll) {
    // Admin view: join through standardSeats to get household address
    requests = await db
      .select({
        MaintenanceRequest: maintenanceRequests,
        user: users,
        standardSeat: standardSeats,
        household: households,
      })
      .from(maintenanceRequests)
      .leftJoin(users, eq(maintenanceRequests.userId, users.id))
      .leftJoin(standardSeats, eq(maintenanceRequests.userId, standardSeats.userId))
      .leftJoin(households, eq(standardSeats.householdId, households.id))
      .where(whereClause)
      .orderBy(desc(maintenanceRequests.createdAt));
  } else {
    // Resident view: simple join
    requests = await db
      .select({
        MaintenanceRequest: maintenanceRequests,
        user: users,
      })
      .from(maintenanceRequests)
      .leftJoin(users, eq(maintenanceRequests.userId, users.id))
      .where(whereClause)
      .orderBy(desc(maintenanceRequests.createdAt));
  }

  // Transform results
  const transformed = requests.map(row => {
    const mr = row.MaintenanceRequest;
    const u = row.user;
    const hh = row.household;

    // Get household address from standardSeats
    const address = hh ? { street: hh.street, unit: hh.unit } : null;

    return {
      id: mr.id,
      userId: mr.userId,
      category: mr.category,
      priority: mr.priority,
      description: mr.description,
      status: mr.status,
      images: mr.images,
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

  return NextResponse.json(filteredResults);
}

/**
 * POST /api/maintenance - Create a new maintenance request
 * @body userId - Optional user ID (defaults to authenticated user)
 * @body category - Issue category (PLUMBING, ELECTRICAL, etc.)
 * @body priority - Priority level (LOW, MEDIUM, HIGH, EMERGENCY)
 * @body description - Detailed description
 * @body images - Optional array of image URLs
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = maintenanceRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { category, priority, description } = validationResult.data;
    const userId = body.userId || authData.userId;

    // Use Drizzle insert - use raw SQL to generate ID
    const now = new Date();
    const insertValues: typeof maintenanceRequests.$inferInsert = {
      id: crypto.randomUUID(),
      userId,
      category,
      priority,
      description,
      images: body.images || [],
      status: 'SUBMITTED',
      createdAt: now,
      updatedAt: null,
    };
    const insertResult = await db.insert(maintenanceRequests).values(insertValues).returning();

    const maintenanceRequest = insertResult[0];

    // Revalidate dashboard caches immediately when new request is created
    revalidateDashboard();

    return NextResponse.json(maintenanceRequest, { status: 201 });
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/maintenance' }, 'Maintenance request creation error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
