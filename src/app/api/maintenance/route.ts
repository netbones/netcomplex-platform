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

  // Build query conditions - use sql to compare enums
  const queryConditions = [];

  // Filter by user if not admin
  if (!canViewAll) {
    queryConditions.push(eq(maintenanceRequests.userId, authData.userId));
  }

  // Filter by status if provided - cast to the enum type
  if (status) {
    queryConditions.push(eq(maintenanceRequests.status, status as any));
  }

  const whereClause = queryConditions.length > 0 ? and(...queryConditions) : undefined;

  // Execute query with left join to get user info
  const requests = await db
    .select()
    .from(maintenanceRequests)
    .leftJoin(users, eq(maintenanceRequests.userId, users.id))
    .where(whereClause)
    .orderBy(desc(maintenanceRequests.createdAt));

  // Transform results - Drizzle joins use the table name as key (PascalCase)
  const transformed = requests.map(row => {
    const mr = row.MaintenanceRequest;
    const u = row.user;
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
          }
        : null,
    };
  });

  return NextResponse.json(transformed);
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
    const insertValues = {
      id: sql`gen_random_uuid()`,
      userId,
      category,
      priority,
      description,
      images: body.images || [],
      status: 'SUBMITTED',
      createdAt: now,
      updatedAt: sql`null`,
    };
    const insertResult = await db
      .insert(maintenanceRequests)
      .values(insertValues as any)
      .returning();

    const maintenanceRequest = insertResult[0];

    // Revalidate dashboard caches immediately when new request is created
    revalidateDashboard();

    return NextResponse.json(maintenanceRequest, { status: 201 });
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/maintenance' }, 'Maintenance request creation error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
