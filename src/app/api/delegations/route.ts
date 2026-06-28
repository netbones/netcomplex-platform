import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import {
  db,
  agentAccesses,
  properties,
  users,
  apiSuccess,
  apiUnauthorized,
  apiError,
  getSessionAndRole,
} from '@api/server';

export const maxDuration = 5;

// Valid delegation status values for filter validation
const VALID_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED'] as const;
type DelegationStatusFilter = (typeof VALID_STATUSES)[number];

function isDelegationStatus(s: string): s is DelegationStatusFilter {
  return VALID_STATUSES.includes(s as DelegationStatusFilter);
}

export async function GET(request: Request): Promise<Response> {
  const { tenantId } = await withTenant();

  const session = await getSessionAndRole(request);
  if (!session) return apiUnauthorized();

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('propertyId');
  const statusParam = url.searchParams.get('status');
  const agentIdParam = url.searchParams.get('agentId');

  // Validate status filter
  if (statusParam && !isDelegationStatus(statusParam.toUpperCase())) {
    return apiError(
      'VALIDATION_ERROR',
      `Invalid status: ${statusParam}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      400
    );
  }

  const statusFilter = statusParam
    ? (statusParam.toUpperCase() as DelegationStatusFilter)
    : undefined;

  // Build where conditions
  const conditions = [eq(agentAccesses.tenantId, tenantId)];

  if (propertyId) conditions.push(eq(agentAccesses.propertyId, propertyId));
  if (statusFilter) conditions.push(eq(agentAccesses.status, statusFilter));
  if (agentIdParam) conditions.push(eq(agentAccesses.agentId, agentIdParam));

  // Owners see delegations they granted; providers see delegations assigned to them; admins see all
  const isAdmin = ['ADMIN', 'BOARD'].includes(session.role ?? '');
  if (!isAdmin) {
    // Non-admins can only see their granted delegations.
    // Providers query with ?agentId=<their-id> to see assigned delegations.
    conditions.push(eq(agentAccesses.grantedById, session.userId));
  }

  const delegations = await db
    .select({
      id: agentAccesses.id,
      propertyId: agentAccesses.propertyId,
      agentId: agentAccesses.agentId,
      grantedById: agentAccesses.grantedById,
      permissions: agentAccesses.permissions,
      status: agentAccesses.status,
      startedAt: agentAccesses.startedAt,
      expiresAt: agentAccesses.expiresAt,
      acceptedAt: agentAccesses.acceptedAt,
      rejectedAt: agentAccesses.rejectedAt,
      createdAt: agentAccesses.createdAt,
    })
    .from(agentAccesses)
    .where(and(...conditions))
    .orderBy(desc(agentAccesses.createdAt))
    .limit(100);

  // Fetch property addresses and agent names separately (Drizzle doesn't have Prisma's include)
  const propertyIds = [...new Set(delegations.map(d => d.propertyId))];
  const agentIds = [
    ...new Set([...delegations.map(d => d.agentId), ...delegations.map(d => d.grantedById)]),
  ];

  // Fetch properties
  const propertyRecords =
    propertyIds.length > 0
      ? await db
          .select({ id: properties.id, street: properties.street, unit: properties.unit })
          .from(properties)
          .where(eq(properties.tenantId, tenantId))
      : [];

  // Fetch users for names
  const userRecords =
    agentIds.length > 0
      ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users)
      : [];

  const propertyMap = new Map(propertyRecords.map(p => [p.id, p]));
  const userMap = new Map(userRecords.map(u => [u.id, u]));

  const formatted = delegations.map(d => {
    const prop = propertyMap.get(d.propertyId);
    const agent = userMap.get(d.agentId);
    const grantor = userMap.get(d.grantedById);

    return {
      id: d.id,
      propertyId: d.propertyId,
      propertyAddress: prop ? `${prop.street}${prop.unit ? ` ${prop.unit}` : ''}` : null,
      agentId: d.agentId,
      agentName: agent?.name ?? null,
      agentEmail: agent?.email ?? null,
      grantedById: d.grantedById,
      grantedByName: grantor?.name ?? null,
      permissions: d.permissions,
      status: d.status,
      startedAt: d.startedAt.toISOString(),
      expiresAt: d.expiresAt.toISOString(),
      acceptedAt: d.acceptedAt?.toISOString() ?? null,
      rejectedAt: d.rejectedAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    };
  });

  return apiSuccess(formatted);
}
