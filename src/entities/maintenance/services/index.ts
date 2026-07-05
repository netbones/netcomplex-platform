import {
  db,
  maintenanceRequests,
  maintenanceTeams,
  serviceProviders,
  users,
  properties,
  toMaintenanceRequestDTO,
} from '@api/server';

import { eq, desc, and, sql, inArray } from 'drizzle-orm';

/**
 * Pure function that formats a ticket number string.
 * Does NOT query the database — callers pass the counter value.
 * Default format: SRV-{YYYY}-{NNNN}
 */
export function formatTicketNumber(counter: number, prefix: string = 'SRV'): string {
  const year = new Date().getFullYear();
  const sequence = String(counter).padStart(4, '0');
  return `${prefix}-${year}-${sequence}`;
}

/**
 * Generates a ticket number using the tenant-configured format.
 * Default format: SRV-{YYYY}-{NNNN} where NNNN is a sequential number within the year.
 * Queries the count of existing requests for this tenant this year and increments.
 */
export async function generateTicketNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int + 1` })
    .from(maintenanceRequests)
    .where(
      and(
        eq(maintenanceRequests.tenantId, tenantId),
        sql`${maintenanceRequests.createdAt} >= ${yearStart}`
      )
    );

  const counter = result?.count ?? 1;
  return formatTicketNumber(counter);
}

/**
 * Builds query conditions for listing maintenance requests.
 */
export function buildMaintenanceConditions(params: {
  tenantId: string;
  userId: string;
  canViewAll: boolean;
  scope?: 'mine' | 'all' | null;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const conditions: (
    | ReturnType<typeof eq>
    | ReturnType<typeof sql>
    | ReturnType<typeof inArray>
  )[] = [eq(maintenanceRequests.tenantId, params.tenantId)];

  // Force user-scoping if scope=mine OR if user lacks view-all permission
  if (params.scope === 'mine' || !params.canViewAll) {
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

  // Support comma-separated priority values (e.g., "EMERGENCY,HIGH")
  if (params.priority && params.priority !== 'all') {
    const priorities = params.priority
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
    if (priorities.length === 1) {
      conditions.push(
        eq(
          maintenanceRequests.priority,
          priorities[0] as (typeof maintenanceRequests.priority.enumValues)[number]
        )
      );
    } else if (priorities.length > 1) {
      conditions.push(
        inArray(
          maintenanceRequests.priority,
          priorities as (typeof maintenanceRequests.priority.enumValues)[number][]
        )
      );
    }
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
 * Admin view joins with team/provider for assignment info.
 */
export async function listMaintenanceRequests(params: {
  tenantId: string;
  userId: string;
  canViewAll: boolean;
  scope?: 'mine' | 'all' | null;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const conditions = buildMaintenanceConditions(params);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Effective view: when scope=mine is requested, treat as resident view even for admins
  const effectiveCanViewAll = params.canViewAll && params.scope !== 'mine';

  if (effectiveCanViewAll) {
    // Admin view: join with properties, teams, providers for full context
    return db
      .select({
        MaintenanceRequest: maintenanceRequests,
        user: users,
        property: properties,
        team: maintenanceTeams,
        provider: serviceProviders,
      })
      .from(maintenanceRequests)
      .leftJoin(users, eq(maintenanceRequests.userId, users.id))
      .leftJoin(properties, eq(maintenanceRequests.propertyId, properties.id))
      .leftJoin(maintenanceTeams, eq(maintenanceRequests.assignedTeamId, maintenanceTeams.id))
      .leftJoin(serviceProviders, eq(maintenanceRequests.assignedProviderId, serviceProviders.id))
      .where(whereClause)
      .orderBy(desc(maintenanceRequests.createdAt));
  } else {
    // Resident view: simple join with user
    return db
      .select({
        MaintenanceRequest: maintenanceRequests,
        user: users,
        property: sql<null>`null`,
        team: maintenanceTeams,
        provider: serviceProviders,
      })
      .from(maintenanceRequests)
      .leftJoin(users, eq(maintenanceRequests.userId, users.id))
      .leftJoin(maintenanceTeams, eq(maintenanceRequests.assignedTeamId, maintenanceTeams.id))
      .leftJoin(serviceProviders, eq(maintenanceRequests.assignedProviderId, serviceProviders.id))
      .where(whereClause)
      .orderBy(desc(maintenanceRequests.createdAt));
  }
}

/**
 * Creates a new maintenance request with ticket number generation.
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
  preferredDate?: string | null;
  preferredTime?: string | null;
  routingType?: 'HOA' | 'LANDLORD' | null;
  landlordId?: string | null;
}) {
  const now = new Date();
  const ticketNumber = await generateTicketNumber(data.tenantId);

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
      ticketNumber,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
      preferredTime: data.preferredTime || null,
      routingType: data.routingType || 'HOA',
      landlordId: data.landlordId || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
}

type MaintenanceRow = {
  MaintenanceRequest: typeof maintenanceRequests.$inferSelect;
  user: typeof users.$inferSelect | null;
  property: typeof properties.$inferSelect | null;
  team: typeof maintenanceTeams.$inferSelect | null;
  provider: typeof serviceProviders.$inferSelect | null;
};

export function toMaintenanceRequestViewList(
  rows: MaintenanceRow[],
  scope: 'all' | 'mine' | 'community',
  search?: string | null
) {
  const transformed = rows.map(row => {
    const mr = row.MaintenanceRequest;
    const u = row.user;
    const prop = row.property;
    const team = row.team;
    const provider = row.provider;

    const address = prop ? { street: prop.street, unit: prop.unit } : null;

    return {
      ...toMaintenanceRequestDTO(mr),
      user: u ? { name: u.name, email: u.email, address } : null,
      assignedTeam: team ? { id: team.id, name: team.name, trade: team.trade } : null,
      assignedProvider: provider
        ? { id: provider.id, companyName: provider.companyName, trade: provider.trade }
        : null,
    };
  });

  if (scope === 'community') {
    return transformed.map(r => ({
      id: r.id,
      ticketNumber: r.ticketNumber,
      category: r.category,
      priority: r.priority,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  if (search) {
    const q = search.toLowerCase();
    return transformed.filter(r => {
      const user = r.user;
      const address = user?.address;
      return (
        r.description?.toLowerCase().includes(q) ||
        user?.name?.toLowerCase().includes(q) ||
        user?.email?.toLowerCase().includes(q) ||
        address?.street?.toLowerCase().includes(q) ||
        address?.unit?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.ticketNumber?.toLowerCase().includes(q)
      );
    });
  }

  return transformed;
}
