import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { templates } from '@/lib/email/templates';
import { db, verifications, users } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { logError } from '@shared/lib';
import { ENV } from 'varlock/env';

const RESET_LINK_BASE = ENV.NEXT_PUBLIC_APP_URL;
const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Password reset request endpoint.
 * Generates a reset token and sends password reset email via MailerSend.
 *
 * Implements email enumeration protection by always returning success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists with this email
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Always return success to prevent email enumeration attacks
    // Even if user doesn't exist, return same message
    if (!existingUser) {
      return NextResponse.json(
        { message: 'If an account exists with this email, a reset link has been sent.' },
        { status: 200 }
      );
    }

    // Generate a secure reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Create or update verification record
    // Delete any existing reset tokens for this email first
    await db
      .delete(verifications)
      .where(and(eq(verifications.identifier, 'password-reset'), eq(verifications.value, email)));

    // Insert new verification record
    await db.insert(verifications).values({
      id: crypto.randomUUID(),
      tenantId: existingUser.tenantId || null,
      identifier: 'password-reset',
      value: email,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Build reset URL
    const resetUrl = `${RESET_LINK_BASE}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send password reset email
    const html = templates.passwordReset.getHtml(resetUrl);

    await sendEmail({
      to: email,
      subject: templates.passwordReset.subject,
      html,
    });

    return NextResponse.json(
      { message: 'If an account exists with this email, a reset link has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    logError(
      { component: 'forgot-password-api', operation: 'FORGOT_PASSWORD' },
      'Password reset request failed',
      error
    );

    // Still return success to prevent email enumeration attacks
    return NextResponse.json(
      { message: 'If an account exists with this email, a reset link has been sent.' },
      { status: 200 }
    );
  }
}
