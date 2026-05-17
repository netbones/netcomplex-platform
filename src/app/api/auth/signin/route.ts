import { NextRequest, NextResponse } from 'next/server';
import { verifyTurnstile } from '@shared/api/turnstile';

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

/**
 * Custom sign-in endpoint with Turnstile bot protection.
 * Verifies the captcha token before proxying to Better Auth.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, turnstileToken } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Verify Turnstile token if provided
    if (turnstileToken) {
      const isHuman = await verifyTurnstile(turnstileToken);
      if (!isHuman) {
        return NextResponse.json(
          { error: 'Bot verification failed. Please try again.' },
          { status: 403 }
        );
      }
    }

    // Proxy to Better Auth sign-in
    const authResponse = await fetch(`${BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await authResponse.json();

    if (!authResponse.ok) {
      return NextResponse.json(data, { status: authResponse.status });
    }

    // Set cookies from Better Auth response
    const response = NextResponse.json(data);
    const setCookie = authResponse.headers.get('set-cookie');
    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Sign-in failed. Please try again.' }, { status: 500 });
  }
}
