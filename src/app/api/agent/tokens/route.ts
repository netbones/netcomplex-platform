import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';

import { db, users, apiSuccess, apiForbidden, apiNotFound, apiValidationError } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant } from '@entities/tenant/server';
import { agentTokens } from '@schema/agent-tokens';
import { signAgentToken, hashToken } from '@shared/lib/agent-token';
import { createPrefixedId } from '@shared/lib/id';

export const maxDuration = 5;

const createTokenSchema = z.object({
  agentId: z.string().min(1),
  accessId: z.string().optional(),
  name: z.string().min(1).max(256),
  scope: z.object({
    spaces: z.array(z.string()),
    pages: z.array(z.string()),
    apis: z.array(z.string()),
    dataDomains: z.array(z.string()),
    actions: z.array(z.string()),
    maxDuration: z
      .number()
      .int()
      .positive()
      .max(86400 * 365), // 1 year max
  }),
  expiresInSeconds: z
    .number()
    .int()
    .positive()
    .max(86400 * 365),
});

export async function POST(request: NextRequest) {
  const { tenantId } = await withTenant();

  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const body = await request.json();
  const parsed = createTokenSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { agentId, accessId, name, scope, expiresInSeconds } = parsed.data;

  // Verify issuing user has admin role
  const [issuingUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, auth.data.userId))
    .limit(1);

  if (!issuingUser || !['ADMIN', 'BOARD'].includes(issuingUser.role ?? '')) {
    return apiForbidden('Only admins can issue agent tokens');
  }

  // Verify target agent exists
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, agentId))
    .limit(1);

  if (!targetUser) {
    return apiNotFound('Target agent user not found');
  }

  // Create token record (id first, then sign with it)
  const tokenId = createPrefixedId('at');

  // Sign the JWT
  const rawToken = await signAgentToken({
    agentId,
    tokenId,
    tenantId,
    callerType: 'ai',
    scope,
    expiresInSeconds,
  });

  const tokenHashValue = hashToken(rawToken);

  // Persist the token record
  await db.insert(agentTokens).values({
    id: tokenId,
    tenantId,
    agentId,
    issuedById: auth.data.userId,
    accessId: accessId ?? null,
    name,
    tokenHash: tokenHashValue,
    scope,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  });

  return apiSuccess(
    {
      id: tokenId,
      name,
      scope,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      // Return raw token ONLY on creation — it cannot be recovered later
      token: rawToken,
    },
    undefined,
    201
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { tenantId } = await withTenant();

  const tokens = await db
    .select({
      id: agentTokens.id,
      agentId: agentTokens.agentId,
      issuedById: agentTokens.issuedById,
      name: agentTokens.name,
      scope: agentTokens.scope,
      expiresAt: agentTokens.expiresAt,
      revokedAt: agentTokens.revokedAt,
      lastUsedAt: agentTokens.lastUsedAt,
      createdAt: agentTokens.createdAt,
    })
    .from(agentTokens)
    .where(eq(agentTokens.tenantId, tenantId))
    .orderBy(desc(agentTokens.createdAt))
    .limit(100);

  return apiSuccess(tokens);
}
