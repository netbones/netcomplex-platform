import { eq, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import {
  db,
  agentAccesses,
  delegationActions,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  getSessionAndRole,
} from '@api/server';

export const maxDuration = 5;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { tenantId } = await withTenant();

  const session = await getSessionAndRole(request);
  if (!session) return apiUnauthorized();

  const { id } = await params;

  const [delegation] = await db
    .select({
      id: agentAccesses.id,
      tenantId: agentAccesses.tenantId,
      grantedById: agentAccesses.grantedById,
      agentId: agentAccesses.agentId,
    })
    .from(agentAccesses)
    .where(eq(agentAccesses.id, id))
    .limit(1);

  if (!delegation || delegation.tenantId !== tenantId) {
    return apiNotFound('Delegation not found');
  }

  // Access control: only owner (grantedBy), the agent, or admin can see the audit log
  const isOwner = delegation.grantedById === session.userId;
  const isAgent = delegation.agentId === session.userId;
  const isAdmin = ['ADMIN', 'BOARD'].includes(session.role ?? '');
  if (!isOwner && !isAgent && !isAdmin) {
    return apiForbidden('Access denied');
  }

  const entries = await db
    .select({
      id: delegationActions.id,
      delegationId: delegationActions.delegationId,
      action: delegationActions.action,
      actorId: delegationActions.actorId,
      metadata: delegationActions.metadata,
      createdAt: delegationActions.createdAt,
    })
    .from(delegationActions)
    .where(eq(delegationActions.delegationId, id))
    .orderBy(desc(delegationActions.createdAt))
    .limit(50);

  const formatted = entries.map(e => ({
    id: e.id,
    delegationId: e.delegationId,
    action: e.action,
    actorId: e.actorId,
    metadata: e.metadata as Record<string, unknown> | null,
    createdAt: e.createdAt.toISOString(),
  }));

  return apiSuccess(formatted);
}
