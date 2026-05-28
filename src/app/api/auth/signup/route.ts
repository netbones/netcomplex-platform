import { NextRequest } from 'next/server';
import { logError, apiLogger } from '@shared/lib';
import { verifyTurnstile } from '@shared/api/turnstile';
import { db, invitations, users } from '@api/db';
import { eq, and, gt } from 'drizzle-orm';

import { apiCreated, apiError, apiSuccess } from '@api/api-response';
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

/**
 * User signup endpoint with welcome email and bot protection.
 * Verifies Turnstile token, forwards to Better Auth's sign-up handler, then sends welcome email.
 * If an invitationToken is provided, applies the invitation role/tenant after signup.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, turnstileToken, invitationToken } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return apiSuccess({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    // Verify Turnstile token if provided
    if (turnstileToken) {
      const isHuman = await verifyTurnstile(turnstileToken);
      if (!isHuman) {
        return apiSuccess({ error: 'Bot verification failed. Please try again.' }, { status: 403 });
      }
    }

    // If invitation token provided, validate it before signup
    let invitationData = null;
    if (invitationToken) {
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(and(eq(invitations.token, invitationToken), eq(invitations.status, 'PENDING')))
        .limit(1);

      if (!invitation) {
        return apiError('VALIDATION_ERROR', 'Invalid or expired invitation token', 400);
      }

      if (new Date() > invitation.expiresAt) {
        await db
          .update(invitations)
          .set({ status: 'EXPIRED' })
          .where(eq(invitations.id, invitation.id));
        return apiError('VALIDATION_ERROR', 'Invitation has expired', 410);
      }

      invitationData = invitation;
    }

    // Forward to Better Auth's sign-up endpoint
    const authResponse = await fetch(`${BETTER_AUTH_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    const responseData = await authResponse.json();

    // If signup succeeded, send welcome email and process invitation
    if (authResponse.ok) {
      // Note: We intentionally don't await this to not block the response
      // and we don't fail the signup if email fails
      sendWelcomeEmail(email, name).catch(error => {
        logError(
          { component: 'signup-email', operation: 'SEND_WELCOME' },
          'Failed to send welcome email',
          error
        );
      });

      // Process invitation if token was provided
      if (invitationData) {
        processInvitation(invitationData, email).catch(error => {
          apiLogger.error(
            { invitationId: invitationData.id, email },
            'Failed to process invitation after signup',
            error
          );
        });
      }

      return apiCreated(responseData);
    }

    // Return Better Auth's error response
    if (authResponse.status === 422) {
      return apiError('VALIDATION_ERROR', 'Email address is already registered', 409);
    }

    return apiSuccess(responseData, { status: authResponse.status });
  } catch (error) {
    logError({ component: 'signup-api', operation: 'USER_SIGNUP' }, 'Failed to create user', error);

    return apiSuccess({ error: 'Failed to create account. Please try again.' }, { status: 500 });
  }
}

/**
 * Process invitation after user signup.
 * Updates user's role and tenantId, marks invitation as ACCEPTED.
 */
async function processInvitation(
  invitation: { id: string; role: string; tenantId: string },
  email: string
) {
  try {
    // Find the newly created user
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      apiLogger.error({ email }, 'User not found after signup for invitation processing');
      return;
    }

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
        { userId: user.id, invitationId: invitation.id },
        'Failed to update user role via Better Auth'
      );
      return;
    }

    // Mark invitation as accepted
    await db
      .update(invitations)
      .set({ status: 'ACCEPTED' })
      .where(eq(invitations.id, invitation.id));

    apiLogger.info(
      { userId: user.id, invitationId: invitation.id, role: invitation.role },
      'Invitation processed after signup'
    );
  } catch (error) {
    apiLogger.error(
      { invitationId: invitation.id, email },
      'Error processing invitation after signup',
      error
    );
  }
}

/**
 * Send welcome email to new user.
 * Silently handles errors to not affect the signup flow.
 */
async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { sendEmail } = await import('@shared/api/email/resend');
    const { templates } = await import('@shared/api/email/templates');

    const html = templates.welcome.getHtml(name);

    await sendEmail({
      to: email,
      subject: templates.welcome.subject,
      html,
    });
  } catch (_error) {
    // Email failure shouldn't affect signup
  }
}
