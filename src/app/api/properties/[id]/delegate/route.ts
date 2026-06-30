import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import {
  db,
  properties,
  users,
  agentAccesses,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiValidationError,
  apiConflict,
  apiError,
  getSessionAndRole,
} from '@api/server';
import { SCOPE_BUNDLES, validateScopes } from '@entities/agent';
import { logDelegationAction } from '@api/shared/delegations';
import type { AgentScope } from '@entities/agent';
import { createPrefixedId } from '@shared/lib/id';

export const maxDuration = 8;

const delegateSchema = z
  .object({
    providerId: z.string().min(1),
    scopes: z.array(z.string().min(1)).min(1).max(25).optional(),
    bundle: z
      .enum(['letting-agent', 'maintenance-contractor', 'inspector', 'property-manager'])
      .optional(),
    expiresAt: z.string().datetime().optional(),
    contractTerms: z.string().max(2000).optional(),
  })
  .refine(d => d.scopes || d.bundle, {
    message: 'Either scopes or bundle must be provided',
  });

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const { tenantId } = await withTenant();

  const session = await getSessionAndRole(request);
  if (!session) return apiUnauthorized();

  const propertyId = params.id;

  // Verify property exists and caller owns it
  const [property] = await db
    .select({ id: properties.id, ownerId: properties.ownerId })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.tenantId, tenantId)))
    .limit(1);

  if (!property) {
    return apiNotFound('Property not found');
  }

  // Owner check: the property must belong to the calling user
  if (property.ownerId !== session.userId) {
    return apiForbidden('Only the property owner can delegate access');
  }

  const body = await request.json();
  const parsed = delegateSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { providerId, expiresAt, contractTerms } = parsed.data;

  // Resolve effective scopes from bundle or explicit scopes
  const effectiveScopes = parsed.data.bundle
    ? [...SCOPE_BUNDLES[parsed.data.bundle]]
    : parsed.data.scopes!;

  const unknownScopes = validateScopes(effectiveScopes);
  if (unknownScopes.length > 0) {
    return apiError(
      'VALIDATION_ERROR',
      `Unknown scopes: ${unknownScopes.join(', ')}. See AGENT_SCOPES for valid values.`,
      400
    );
  }

  // Verify provider exists
  const [provider] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, providerId))
    .limit(1);

  if (!provider) {
    return apiNotFound('Provider not found');
  }

  // Prevent self-delegation
  if (providerId === session.userId) {
    return apiConflict('Cannot delegate to yourself');
  }

  // Check for existing active/pending delegation for same property+agent
  const [existing] = await db
    .select({ id: agentAccesses.id })
    .from(agentAccesses)
    .where(
      and(
        eq(agentAccesses.tenantId, tenantId),
        eq(agentAccesses.propertyId, propertyId),
        eq(agentAccesses.agentId, providerId),
        inArray(agentAccesses.status, ['PENDING', 'ACTIVE'])
      )
    )
    .limit(1);

  if (existing) {
    return apiConflict(
      'An active or pending delegation already exists for this property and provider'
    );
  }

  // Default expiry: 90 days from now if not specified
  const expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const delegationId = createPrefixedId('del');

  // Create the delegation (AgentAccess record)
  await db.insert(agentAccesses).values({
    id: delegationId,
    tenantId,
    agentId: providerId,
    propertyId,
    grantedById: session.userId,
    permissions: effectiveScopes,
    originalPermissions: effectiveScopes,
    status: 'PENDING',
    startedAt: new Date(),
    expiresAt: expiry,
    contractTerms: contractTerms ?? null,
    updatedAt: new Date(),
  });

  // Audit: delegation created
  await logDelegationAction({
    tenantId,
    delegationId,
    action: 'created',
    actorId: session.userId,
    metadata: {
      scopes: effectiveScopes,
      expiresAt: expiry.toISOString(),
    },
  });

  return apiSuccess(
    {
      id: delegationId,
      propertyId,
      providerId,
      permissions: effectiveScopes,
      status: 'PENDING',
      expiresAt: expiry.toISOString(),
      createdAt: new Date().toISOString(),
    },
    undefined,
    201
  );
}
