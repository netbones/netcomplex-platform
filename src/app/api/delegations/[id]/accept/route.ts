import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import {
  db,
  agentAccesses,
  agentProfiles,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiConflict,
  apiGone,
  getSessionAndRole,
} from '@api/server';
import { agentTokens } from '@schema/agent-tokens';
import { signAgentToken, hashToken } from '@shared/lib/agent-token';
import { logDelegationAction } from '@api/shared/delegations';
import { createPrefixedId } from '@shared/lib/id';
import type { AgentScopeConfig } from '@entities/agent';

export const maxDuration = 8;

function buildApiScopes(permissions: string[]): string[] {
  const map: Record<string, string[]> = {
    'listing:read': ['properties:read'],
    'listing:manage': ['properties:write'],
    'listing:market': ['marketplace:write'],
    'maintenance:manage': ['maintenance:write'],
    'maintenance:coordinate': ['maintenance:write'],
    'financials:read': ['finances:read'],
    'financials:collect': ['finances:write'],
    'tenancy:manage': ['tenancy:write'],
    'communication:contact_occupant': ['messages:write'],
  };
  const apis = new Set<string>();
  for (const p of permissions) {
    (map[p] ?? []).forEach(a => apis.add(a));
  }
  return [...apis];
}

function getWriteActions(permissions: string[]): string[] {
  const writeScopes = [
    'maintenance:manage',
    'maintenance:coordinate',
    'maintenance:create',
    'listing:manage',
    'listing:market',
    'financials:collect',
    'tenancy:manage',
    'inspection:record',
    'documents:upload',
    'communication:contact_occupant',
  ];
  const hasWrite = permissions.some(p => writeScopes.includes(p));
  return hasWrite ? ['write'] : [];
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const { tenantId } = await withTenant();

  const session = await getSessionAndRole(request);
  if (!session) return apiUnauthorized();

  const delegationId = params.id;

  const [delegation] = await db
    .select({
      id: agentAccesses.id,
      tenantId: agentAccesses.tenantId,
      agentId: agentAccesses.agentId,
      propertyId: agentAccesses.propertyId,
      status: agentAccesses.status,
      permissions: agentAccesses.permissions,
      expiresAt: agentAccesses.expiresAt,
    })
    .from(agentAccesses)
    .where(eq(agentAccesses.id, delegationId))
    .limit(1);

  if (!delegation || delegation.tenantId !== tenantId) {
    return apiNotFound('Delegation not found');
  }

  // Only the target provider can accept
  if (delegation.agentId !== session.userId) {
    return apiForbidden('Only the delegated provider can accept this delegation');
  }

  // Must be PENDING
  if (delegation.status !== 'PENDING') {
    return apiConflict(`Cannot accept a ${delegation.status.toLowerCase()} delegation`);
  }

  // Check expiry
  if (new Date(delegation.expiresAt) < new Date()) {
    // Auto-reject expired
    await db
      .update(agentAccesses)
      .set({ status: 'EXPIRED', updatedAt: new Date() })
      .where(eq(agentAccesses.id, delegationId));

    await logDelegationAction({
      tenantId,
      delegationId,
      action: 'expired',
      actorId: 'system',
      metadata: { autoExpiredAt: new Date().toISOString() },
    });

    return apiGone('This delegation has expired');
  }

  // D-18: Provider verification gate
  const [agentProfile] = await db
    .select({ isVerified: agentProfiles.isVerified })
    .from(agentProfiles)
    .where(eq(agentProfiles.agentId, session.userId))
    .limit(1);

  if (!agentProfile || !agentProfile.isVerified) {
    return apiForbidden('Only verified providers can accept delegations');
  }

  // Build effective scope from delegation permissions
  const maxDurationSec = Math.ceil((new Date(delegation.expiresAt).getTime() - Date.now()) / 1000);

  const scope: AgentScopeConfig = {
    spaces: ['services'],
    pages: delegation.permissions.map(p => p.toLowerCase()),
    apis: buildApiScopes(delegation.permissions),
    dataDomains: delegation.permissions.map(p => p.toLowerCase()),
    actions: ['read', ...getWriteActions(delegation.permissions)],
    maxDuration: maxDurationSec > 0 ? maxDurationSec : 86400 * 90,
  };

  // Update delegation status to ACTIVE
  await db
    .update(agentAccesses)
    .set({
      status: 'ACTIVE',
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(agentAccesses.id, delegationId));

  // Issue an AgentToken linked to this delegation
  const tokenId = createPrefixedId('dt');
  const rawToken = await signAgentToken({
    agentId: delegation.agentId,
    tokenId,
    tenantId,
    callerType: 'delegated',
    scope,
    delegationId,
    expiresInSeconds: scope.maxDuration,
  });

  const tokenHash = hashToken(rawToken);

  await db.insert(agentTokens).values({
    id: tokenId,
    tenantId,
    agentId: delegation.agentId,
    issuedById: session.userId,
    accessId: delegationId,
    name: `Delegation token for property ${delegation.propertyId}`,
    tokenHash,
    scope,
    expiresAt: new Date(Date.now() + scope.maxDuration * 1000),
  });

  // Audit
  await logDelegationAction({
    tenantId,
    delegationId,
    action: 'accepted',
    actorId: session.userId,
    metadata: { tokenId },
  });

  await logDelegationAction({
    tenantId,
    delegationId,
    action: 'token_issued',
    actorId: session.userId,
    metadata: { tokenId },
  });

  return apiSuccess({
    id: delegationId,
    status: 'ACTIVE',
    token: rawToken,
    tokenId,
    expiresAt: new Date(Date.now() + scope.maxDuration * 1000).toISOString(),
  });
}
