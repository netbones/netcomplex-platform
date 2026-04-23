import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { sendEmail } from '@/lib/email/mailer-send';
import { templates } from '@/lib/email/templates';
import { logError } from '@shared/lib';

/**
 * User signup endpoint with welcome email.
 * Uses Better Auth's signUpEmailAndPassword for user creation.
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

    // Create user with Better Auth
    const response = await auth.api.signUpEmailAndPassword({
      body: {
        email,
        password,
        name,
      },
    });

    // Send welcome email after successful signup
    // Note: We intentionally don't await this to not block the response
    // and we don't fail the signup if email fails
    sendWelcomeEmail(email, name).catch(error => {
      logError(
        { component: 'signup-email', operation: 'SEND_WELCOME' },
        'Failed to send welcome email',
        error
      );
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    // Check if it's a duplicate email error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as { message: string }).message;
      if (errorMessage.includes('already') || errorMessage.includes('exists')) {
        return NextResponse.json({ error: 'Email address is already registered' }, { status: 409 });
      }
    }

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
    const { html } = templates.welcome.getHtml(name);

    await sendEmail({
      to: email,
      subject: templates.welcome.subject,
      html,
    });

    console.log(`[Email] Welcome email sent to ${email}`);
  } catch (error) {
    // Log but don't throw - email failure shouldn't affect signup
    console.error(`[Email] Failed to send welcome email to ${email}:`, error);
  }
}
