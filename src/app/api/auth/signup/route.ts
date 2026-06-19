import { NextRequest } from 'next/server';
import { logError, apiLogger } from '@shared/lib';
import {
  db,
  invitations,
  users,
  apiCreated,
  apiConflict,
  apiError,
  apiForbidden,
  apiGone,
  apiInternalError,
  apiSuccess,
  rateLimitByIP,
  verifyTurnstile,
} from '@api/server';

import { eq, and, gt } from 'drizzle-orm';

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

/**
 * User signup endpoint with welcome email and bot protection.
 * Verifies Turnstile token, forwards to Better Auth's sign-up handler, then sends welcome email.
 * If an invitationToken is provided, applies the invitation role/tenant after signup.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 signup attempts per hour per IP
    const rateLimit = rateLimitByIP(request, { windowMs: 3600_000, maxRequests: 3 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const { email, password, name, turnstileToken, invitationToken } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return apiError('VALIDATION_ERROR', 'Email, password, and name are required', 400);
    }

    // Verify Turnstile token if provided
    if (turnstileToken) {
      const isHuman = await verifyTurnstile(turnstileToken);
      if (!isHuman) {
        return apiForbidden('Bot verification failed. Please try again.');
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
        return apiGone('Invitation has expired');
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
    apiLogger.error(
      { status: authResponse.status, body: responseData },
      'Better Auth sign-up rejected'
    );

    if (authResponse.status === 422) {
      return apiConflict('Email address is already registered');
    }

    const errMsg =
      responseData.message ||
      responseData.body?.message ||
      responseData.error?.message ||
      'Signup failed';
    return apiError('VALIDATION_ERROR', errMsg, authResponse.status);
  } catch (error) {
    logError({ component: 'signup-api', operation: 'USER_SIGNUP' }, 'Failed to create user', error);

    return apiInternalError('Failed to create account. Please try again.');
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
    const { sendEmail, templates } = await import('@api/server');

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
