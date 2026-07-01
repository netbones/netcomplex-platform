import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getSessionAndRole,
  apiSuccess,
  apiCreated,
  apiError,
  db,
  residentDelegations,
  properties,
  profiles,
  households,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { eq, and, isNull } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

const RENTER_DELEGATABLE_SCOPES = [
  'maintenance:create',
  'maintenance:read',
  'inspection:schedule',
  'inspection:view',
  'communication:notify_occupant',
] as const;

type RenterScope = (typeof RENTER_DELEGATABLE_SCOPES)[number];

const grantSchema = z.object({
  profileId: z.string().min(1),
  scopes: z.array(z.string().min(1)).min(1),
  expiresAt: z.string().datetime().optional(),
});

const revokeSchema = z.object({
  delegationId: z.string().min(1),
});

// POST — owner grants renter initiation rights
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await withTenant();
  const authData = await getSessionAndRole(request);
  if (!authData) return apiError('UNAUTHORIZED', 'Authentication required', 401);

  const { id } = await params;
  const propertyId = id;

  // Verify caller owns the property
  const [prop] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.tenantId, tenantId)))
    .limit(1);

  if (!prop || prop.ownerId !== authData.userId) {
    return apiError('FORBIDDEN', 'Only the property owner can grant resident delegations', 403);
  }

  const body = await request.json();
  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.issues);
  }

  const { profileId, scopes, expiresAt } = parsed.data;

  const invalidScopes = scopes.filter(s => !RENTER_DELEGATABLE_SCOPES.includes(s as RenterScope));
  if (invalidScopes.length > 0) {
    return apiError(
      'VALIDATION_ERROR',
      `These scopes cannot be delegated to a renter: ${invalidScopes.join(', ')}. ` +
        `Allowed: ${RENTER_DELEGATABLE_SCOPES.join(', ')}`,
      400
    );
  }

  // Verify profile is linked to this property's active household
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(
      households,
      and(eq(households.propertyId, propertyId), eq(households.status, 'ACTIVE'))
    )
    .where(and(eq(profiles.id, profileId), eq(profiles.tenantId, tenantId)))
    .limit(1);

  if (!profile) {
    return apiError(
      'NOT_FOUND',
      'Profile not found or not an active occupant of this property',
      404
    );
  }

  // Revoke existing active delegations for this profile+property
  await db
    .update(residentDelegations)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(residentDelegations.propertyId, propertyId),
        eq(residentDelegations.profileId, profileId),
        isNull(residentDelegations.revokedAt)
      )
    );

  const delegationId = createId();
  const now = new Date();
  await db.insert(residentDelegations).values({
    id: delegationId,
    tenantId,
    propertyId,
    ownerId: authData.userId,
    profileId,
    scopes,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    grantedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return apiCreated({
    id: delegationId,
    profileId,
    scopes,
    grantedAt: now.toISOString(),
    expiresAt: expiresAt ?? null,
  });
}

// GET — list active resident delegations for a property
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await withTenant();
  const authData = await getSessionAndRole(request);
  if (!authData) return apiError('UNAUTHORIZED', 'Authentication required', 401);

  const { id: propertyId } = await params;

  const [prop] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.tenantId, tenantId)))
    .limit(1);

  if (!prop) return apiError('NOT_FOUND', 'Property not found', 404);

  const isOwner = prop.ownerId === authData.userId;
  const isAdmin = ['ADMIN', 'BOARD'].includes(authData.role ?? '');
  if (!isOwner && !isAdmin) {
    return apiError('FORBIDDEN', 'Access denied', 403);
  }

  const delegations = await db
    .select({
      id: residentDelegations.id,
      profileId: residentDelegations.profileId,
      scopes: residentDelegations.scopes,
      grantedAt: residentDelegations.grantedAt,
      expiresAt: residentDelegations.expiresAt,
    })
    .from(residentDelegations)
    .where(
      and(
        eq(residentDelegations.propertyId, propertyId),
        eq(residentDelegations.tenantId, tenantId),
        isNull(residentDelegations.revokedAt)
      )
    )
    .orderBy(residentDelegations.grantedAt);

  return apiSuccess(
    delegations.map(d => ({
      id: d.id,
      profileId: d.profileId,
      profileName: 'Unknown',
      profileAddress: null,
      scopes: d.scopes,
      grantedAt: d.grantedAt.toISOString(),
      expiresAt: d.expiresAt?.toISOString() ?? null,
    }))
  );
}

// DELETE — owner revokes a resident delegation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await withTenant();
  const authData = await getSessionAndRole(request);
  if (!authData) return apiError('UNAUTHORIZED', 'Authentication required', 401);

  const { id } = await params;

  const body = await request.json();
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success)
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.issues);

  const [delegation] = await db
    .select({ id: residentDelegations.id })
    .from(residentDelegations)
    .where(
      and(
        eq(residentDelegations.id, parsed.data.delegationId),
        eq(residentDelegations.tenantId, tenantId),
        isNull(residentDelegations.revokedAt)
      )
    )
    .limit(1);

  if (!delegation) return apiError('NOT_FOUND', 'Delegation not found', 404);

  // Verify property ownership
  const [prop] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, id))
    .limit(1);

  const isOwner = prop?.ownerId === authData.userId;
  const isAdmin = ['ADMIN', 'BOARD'].includes(authData.role ?? '');
  if (!isOwner && !isAdmin) {
    return apiError('FORBIDDEN', 'Only the property owner can revoke this delegation', 403);
  }

  await db
    .update(residentDelegations)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(residentDelegations.id, parsed.data.delegationId));

  return apiSuccess({ id: parsed.data.delegationId, revoked: true });
}
