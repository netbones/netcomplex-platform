import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { withTenant } from '@entities/tenant/server';
import {
  db,
  agentAccesses,
  properties,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiError,
  getSessionAndRole,
} from '@api/server';
import { logDelegationAction } from '@api/shared';

export const maxDuration = 5;

const blockSchema = z.object({
  blocked: z.boolean(),
});

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
      propertyId: agentAccesses.propertyId,
      permissions: agentAccesses.permissions,
      originalPermissions: agentAccesses.originalPermissions,
      grantedById: agentAccesses.grantedById,
    })
    .from(agentAccesses)
    .where(eq(agentAccesses.id, params.id))
    .limit(1);

  if (!delegation || delegation.tenantId !== tenantId) {
    return apiNotFound('Delegation not found');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body', 400);
  }

  const parsed = blockSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.issues);
  }

  const { blocked } = parsed.data;

  // Determine if caller is the resident of the delegated property
  const [property] = await db
    .select({ id: properties.id, ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, delegation.propertyId))
    .limit(1);

  if (!property) {
    return apiNotFound('Property not found');
  }

  // Resident check: the calling user must be an occupant/resident of the property
  const isOwner = property.ownerId === session.userId;
  const isAdmin = ['ADMIN', 'BOARD'].includes(session.role ?? '');

  if (!isOwner && !isAdmin) {
    return apiForbidden('Only the property resident or admin can block agent contact');
  }

  // Narrow the permissions: remove communication:contact_occupant when blocked.
  // Restore only if the original delegation grant included it (ceiling = originalPermissions).
  const currentPermissions = delegation.permissions;
  const originalPermissions = delegation.originalPermissions ?? currentPermissions;
  let newPermissions: string[];

  if (blocked) {
    newPermissions = currentPermissions.filter(p => p !== 'communication:contact_occupant');
  } else {
    // Unblock: restore communication:contact_occupant only if it was in the original grant.
    // Prevents escalation — agent cannot widen scope beyond what the owner delegated.
    if (
      originalPermissions.includes('communication:contact_occupant') &&
      !currentPermissions.includes('communication:contact_occupant')
    ) {
      newPermissions = [...currentPermissions, 'communication:contact_occupant'];
    } else {
      newPermissions = currentPermissions;
    }
  }

  await db
    .update(agentAccesses)
    .set({ permissions: newPermissions, updatedAt: new Date() })
    .where(eq(agentAccesses.id, params.id));

  await logDelegationAction({
    tenantId,
    delegationId: params.id,
    action: blocked ? 'blocked' : 'unblocked',
    actorId: session.userId,
    metadata: {
      previousPermissions: currentPermissions,
      newPermissions,
    },
  });

  return apiSuccess({
    id: params.id,
    blocked,
    permissions: newPermissions,
  });
}
