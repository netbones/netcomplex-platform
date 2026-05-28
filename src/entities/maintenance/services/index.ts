import { db, maintenanceRequests, users, properties } from '@api/db';
import { eq, desc, and, sql } from 'drizzle-orm';

/**
 * Builds query conditions for listing maintenance requests.
 */
export function buildMaintenanceConditions(params: {
  tenantId: string;
  userId: string;
  canViewAll: boolean;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql>)[] = [
    eq(maintenanceRequests.tenantId, params.tenantId),
  ];

  if (!params.canViewAll) {
    conditions.push(eq(maintenanceRequests.userId, params.userId));
  }

  if (params.status && params.status !== 'all') {
    conditions.push(
      eq(
        maintenanceRequests.status,
        params.status as (typeof maintenanceRequests.status.enumValues)[number]
      )
    );
  }

  if (params.priority && params.priority !== 'all') {
    conditions.push(
      eq(
        maintenanceRequests.priority,
        params.priority as (typeof maintenanceRequests.priority.enumValues)[number]
      )
    );
  }

  if (params.category && params.category !== 'all') {
    conditions.push(eq(maintenanceRequests.category, params.category));
  }

  if (params.dateFrom) {
    conditions.push(sql`${maintenanceRequests.createdAt} >= ${new Date(params.dateFrom)}`);
  }
  if (params.dateTo) {
    conditions.push(sql`${maintenanceRequests.createdAt} <= ${new Date(params.dateTo)}`);
  }

  return conditions;
}

/**
 * Lists maintenance requests with admin vs resident views.
 */
export async function listMaintenanceRequests(params: {
  tenantId: string;
  userId: string;
  canViewAll: boolean;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const conditions = buildMaintenanceConditions(params);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  if (params.canViewAll) {
    // Admin view: join with properties to get address
    return db
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
    return db
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
}

/**
 * Creates a new maintenance request.
 */
export async function createMaintenanceRequest(data: {
  id: string;
  tenantId: string;
  userId: string;
  propertyId: string | null;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  description: string;
  images: string[];
}) {
  const now = new Date();
  return db
    .insert(maintenanceRequests)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      userId: data.userId,
      propertyId: data.propertyId,
      category: data.category,
      priority: data.priority,
      description: data.description,
      images: data.images,
      status: 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    })
    .returning();
}
