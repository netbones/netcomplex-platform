import { db, invitations, tenants, users } from '@api/db';
import { eq, and, gt } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * GET /api/invitations/validate?token=<token>
 * Validates an invitation token and returns invitation details.
 * Does NOT require authentication — used by the /invite/[token] page.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
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
    return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
  }

  // Check if expired
  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
  }

  // Check if already accepted or revoked
  if (invitation.status !== 'PENDING') {
    return NextResponse.json(
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

  return NextResponse.json({
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
