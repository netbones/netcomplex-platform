import { NextRequest, NextResponse } from 'next/server';
import { db, verifications, users } from '@api/db';
import { eq, and, gt } from 'drizzle-orm';
import { logError } from '@shared/lib';

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

/**
 * Password reset confirmation endpoint.
 * Validates the reset token and updates the user's password via Better Auth.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, newPassword } = body;

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { error: 'Token, email, and new password are required' },
        { status: 400 }
      );
    }

    // Verify the token exists and hasn't expired
    const [verification] = await db
      .select()
      .from(verifications)
      .where(
        and(
          eq(verifications.id, token),
          eq(verifications.identifier, 'password-reset'),
          eq(verifications.value, email),
          gt(verifications.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!verification) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Update password via Better Auth
    const authResponse = await fetch(`${BETTER_AUTH_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!authResponse.ok) {
      const data = await authResponse.json();
      return NextResponse.json(
        { error: data.error || 'Failed to reset password' },
        { status: authResponse.status }
      );
    }

    // Delete the used verification token
    await db.delete(verifications).where(eq(verifications.id, token));

    return NextResponse.json({ message: 'Password reset successful' });
  } catch (error) {
    logError(
      { component: 'reset-password-api', operation: 'RESET_PASSWORD' },
      'Password reset failed',
      error
    );

    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
