import {
  db,
  invitations,
  tenants,
  users,
  apiError,
  apiGone,
  apiSuccess,
  apiNotFound,
  now,
  withErrorHandler,
} from '@api/server';

import { eq } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * GET /api/invitations/validate?token=<token>
 * Validates an invitation token and returns invitation details.
 * Does NOT require authentication — used by the /invite/[token] page.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return apiError('VALIDATION_ERROR', 'Token is required', 400);
  }

  // Find the invitation by token
  const [invitation] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      name: invitations.name,
      role: invitations.role,
      residencyType: invitations.residencyType,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      tenantId: invitations.tenantId,
      inviterId: invitations.inviterId,
    })
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  if (!invitation) {
    return apiNotFound('Invalid invitation token');
  }

  // Check if expired
  if (now() > invitation.expiresAt) {
    return apiGone('Invitation has expired');
  }

  // Check if already accepted or revoked
  if (invitation.status !== 'PENDING') {
    return apiError(
      'VALIDATION_ERROR',
      `Invitation is no longer pending (status: ${invitation.status})`,
      400
    );
  }

  // Get tenant name
  const [tenant] = await db
    .select({ name: tenants.name, slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, invitation.tenantId))
    .limit(1);

  // Get inviter name
  const [inviter] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, invitation.inviterId))
    .limit(1);

  // Check if user with this email already exists
  const [existingUser] = await db
    .select({ id: users.id, name: users.name, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, invitation.email))
    .limit(1);

  return apiSuccess({
    invitation: {
      ...invitation,
      tenantName: tenant?.name || 'Netcomplex',
      tenantSlug: tenant?.slug,
      inviterName: inviter?.name || 'A community member',
    },
    existingUser: existingUser
      ? { id: existingUser.id, name: existingUser.name, emailVerified: existingUser.emailVerified }
      : null,
  });
});
