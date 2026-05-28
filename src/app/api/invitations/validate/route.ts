import { db, invitations, tenants, users } from '@api/db';
import { eq, and, gt } from 'drizzle-orm';

import { apiError, apiSuccess, apiNotFound } from '@api/api-response';
/**
 * GET /api/invitations/validate?token=<token>
 * Validates an invitation token and returns invitation details.
 * Does NOT require authentication — used by the /invite/[token] page.
 */
export async function GET(request: Request) {
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
      residentType: invitations.residentType,
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
  if (new Date() > invitation.expiresAt) {
    return apiError('VALIDATION_ERROR', 'Invitation has expired', 410);
  }

  // Check if already accepted or revoked
  if (invitation.status !== 'PENDING') {
    return apiSuccess(
      { error: `Invitation is no longer pending (status: ${invitation.status})` },
      { status: 400 }
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
      tenantName: tenant?.name || 'Soralia Village',
      tenantSlug: tenant?.slug,
      inviterName: inviter?.name || 'A community member',
    },
    existingUser: existingUser
      ? { id: existingUser.id, name: existingUser.name, emailVerified: existingUser.emailVerified }
      : null,
  });
}
