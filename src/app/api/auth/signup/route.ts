import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@shared/lib';

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

/**
 * User signup endpoint with welcome email.
 * Forwards to Better Auth's sign-up handler, then sends welcome email.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
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

    // If signup succeeded, send welcome email
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

      return NextResponse.json(responseData, { status: 201 });
    }

    // Return Better Auth's error response
    if (authResponse.status === 422) {
      return NextResponse.json({ error: 'Email address is already registered' }, { status: 409 });
    }

    return NextResponse.json(responseData, { status: authResponse.status });
  } catch (error) {
    logError({ component: 'signup-api', operation: 'USER_SIGNUP' }, 'Failed to create user', error);

    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
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
