import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import {
  db,
  agentAccesses,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiConflict,
  getSessionAndRole,
} from '@api/server';
import { agentTokens } from '@schema/agent-tokens';
import { logDelegationAction } from '@api/shared/delegations';

export const maxDuration = 5;

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const { tenantId } = await withTenant();

  const session = await getSessionAndRole(request);
  if (!session) return apiUnauthorized();

  const [delegation] = await db
    .select({
      id: agentAccesses.id,
      tenantId: agentAccesses.tenantId,
      grantedById: agentAccesses.grantedById,
      status: agentAccesses.status,
    })
    .from(agentAccesses)
    .where(eq(agentAccesses.id, params.id))
    .limit(1);

  if (!delegation || delegation.tenantId !== tenantId) {
    return apiNotFound('Delegation not found');
  }

  // Owner (grantedById) OR admin can revoke
  const isOwner = delegation.grantedById === session.userId;
  const isAdmin = ['ADMIN', 'BOARD'].includes(session.role ?? '');

  if (!isOwner && !isAdmin) {
    return apiForbidden('Only the property owner or admin can revoke this delegation');
  }

  if (delegation.status !== 'ACTIVE' && delegation.status !== 'PENDING') {
    return apiConflict(`Cannot revoke a ${delegation.status.toLowerCase()} delegation`);
  }

  // Revoke the delegation
  await db
    .update(agentAccesses)
    .set({ status: 'REVOKED', revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(agentAccesses.id, params.id));

  // Cascade: revoke all linked agent tokens
  await db
    .update(agentTokens)
    .set({ revokedAt: new Date() })
    .where(eq(agentTokens.accessId, params.id));

  await logDelegationAction({
    tenantId,
    delegationId: params.id,
    action: 'revoked',
    actorId: session.userId,
    metadata: { revokedBy: isAdmin ? 'admin' : 'owner' },
  });

  return apiSuccess({ id: params.id, status: 'REVOKED' });
}
