import { db, invitations, users } from '@api/db';
import { eq, and, gt } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { apiLogger } from '@shared/lib';

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

/**
 * POST /api/invitations/accept
 * Accepts an invitation by token.
 * If the user already exists (by email), links them to the tenant with the invited role.
 * If the user doesn't exist, returns the invitation details for token-based signup.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, userId } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find the invitation by token
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      // Update status to EXPIRED
      await db
        .update(invitations)
        .set({ status: 'EXPIRED' })
        .where(eq(invitations.id, invitation.id));
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    // Check if already processed
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Invitation is no longer pending (status: ${invitation.status})` },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, invitation.email))
      .limit(1);

    if (existingUser) {
      // User exists — link them to the tenant with the invited role
      // Update user's role and tenantId via Better Auth
      const authResponse = await fetch(`${BETTER_AUTH_URL}/api/auth/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            role: invitation.role,
            tenantId: invitation.tenantId,
          },
        }),
      });

      if (!authResponse.ok) {
        apiLogger.error(
          { userId: existingUser.id, invitationId: invitation.id },
          'Failed to update user role via Better Auth'
        );
        return NextResponse.json(
          { error: 'Failed to apply invitation role. Please contact support.' },
          { status: 500 }
        );
      }

      // Mark invitation as accepted
      await db
        .update(invitations)
        .set({ status: 'ACCEPTED' })
        .where(eq(invitations.id, invitation.id));

      return NextResponse.json({
        success: true,
        message: 'Invitation accepted. You have been added to the community.',
        role: invitation.role,
        tenantId: invitation.tenantId,
      });
    }

    // User doesn't exist — return invitation details for token-based signup
    return NextResponse.json({
      success: true,
      requiresSignup: true,
      invitation: {
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        tenantId: invitation.tenantId,
        token: invitation.token,
      },
    });
  } catch (error) {
    apiLogger.error({ operation: 'accept_invitation' }, 'Failed to accept invitation', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation. Please try again.' },
      { status: 500 }
    );
  }
}
