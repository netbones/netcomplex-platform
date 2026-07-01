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
import { logDelegationAction } from '@api/shared/delegations';

export const maxDuration = 5;

export async function POST(
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
      agentId: agentAccesses.agentId,
      status: agentAccesses.status,
    })
    .from(agentAccesses)
    .where(eq(agentAccesses.id, id))
    .limit(1);

  if (!delegation || delegation.tenantId !== tenantId) {
    return apiNotFound('Delegation not found');
  }

  if (delegation.agentId !== session.userId) {
    return apiForbidden('Only the delegated provider can reject this delegation');
  }

  if (delegation.status !== 'PENDING') {
    return apiConflict(`Cannot reject a ${delegation.status.toLowerCase()} delegation`);
  }

  await db
    .update(agentAccesses)
    .set({ status: 'REJECTED', rejectedAt: new Date(), updatedAt: new Date() })
    .where(eq(agentAccesses.id, id));

  await logDelegationAction({
    tenantId,
    delegationId: id,
    action: 'rejected',
    actorId: session.userId,
  });

  return apiSuccess({ id: id, status: 'REJECTED' });
}
