import {
  db,
  invitations,
  users,
  apiError,
  apiGone,
  apiInternalError,
  apiSuccess,
  apiNotFound,
  now,
} from '@api/server';

import { eq } from 'drizzle-orm';

import { apiLogger } from '@shared/lib';

export const maxDuration = 8;

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
    const { token } = body;

    if (!token) {
      return apiError('VALIDATION_ERROR', 'Token is required', 400);
    }

    // Find the invitation by token
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invitation) {
      return apiNotFound('Invalid invitation token');
    }

    // Check if expired
    if (now() > invitation.expiresAt) {
      // Update status to EXPIRED
      await db
        .update(invitations)
        .set({ status: 'EXPIRED' })
        .where(eq(invitations.id, invitation.id));
      return apiGone('Invitation has expired');
    }

    // Check if already processed
    if (invitation.status !== 'PENDING') {
      return apiError(
        'VALIDATION_ERROR',
        `Invitation is no longer pending (status: ${invitation.status})`,
        400
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
        return apiInternalError('Failed to apply invitation role. Please contact support.');
      }

      // Mark invitation as accepted
      await db
        .update(invitations)
        .set({ status: 'ACCEPTED' })
        .where(eq(invitations.id, invitation.id));

      return apiSuccess({
        success: true,
        message: 'Invitation accepted. You have been added to the community.',
        role: invitation.role,
        tenantId: invitation.tenantId,
      });
    }

    // User doesn't exist — return invitation details for token-based signup
    return apiSuccess({
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
    return apiInternalError('Failed to accept invitation. Please try again.');
  }
}
