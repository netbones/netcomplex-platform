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
import { createProviderStub } from '@shared/api';

export const maxDuration = 8;

/**
 * POST /api/invitations/accept
 * Accepts an invitation by token.
 * If the user already exists (by email), links them to the tenant with the invited role.
 * If the user doesn't exist, returns the invitation details for token-based signup.
 */
/**
 * @deprecated Use trpc.invitations.acceptInvitation instead.
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
      // ADVISORY-015: Only promote USER-role accounts. Never downgrade an already-admitted user.
      // PROVIDER invitations skip role assignment — providers must go through the stub+probation pipeline.
      const isProviderInvite = invitation.role === 'PROVIDER';

      if (!isProviderInvite && existingUser.role === 'USER') {
        await db.update(users).set({ role: invitation.role }).where(eq(users.id, existingUser.id));
      } else if (isProviderInvite) {
        // ADVISORY-015 Phase 3B: Create provider stub (PENDING) + verification (PROBATION).
        // User stays at USER role until admin approval (Phase 3C).
        await createProviderStub(existingUser.id, invitation.tenantId);
        apiLogger.info(
          { userId: existingUser.id, invitationId: invitation.id },
          'Provider invitation accepted — stub created, awaiting admin approval'
        );
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
