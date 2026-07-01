import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';

import {
  db,
  users,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiConflict,
  getSessionAndRole,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { agentTokens } from '@schema/agent-tokens';

export const maxDuration = 5;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await withTenant();

  const session = await getSessionAndRole(request);
  if (!session) return apiUnauthorized();

  const { id } = await params;

  const [issuingUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!issuingUser || !['ADMIN', 'BOARD'].includes(issuingUser.role)) {
    return apiForbidden('Only admins can revoke tokens');
  }

  const [token] = await db
    .select()
    .from(agentTokens)
    .where(and(eq(agentTokens.id, id), eq(agentTokens.tenantId, tenantId)))
    .limit(1);

  if (!token) {
    return apiNotFound('Token not found');
  }

  if (token.revokedAt) {
    return apiConflict('Token already revoked');
  }

  await db.update(agentTokens).set({ revokedAt: new Date() }).where(eq(agentTokens.id, id));

  return apiSuccess({ id, revoked: true });
}
