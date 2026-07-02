import { auth, rateLimitByIP, verifyTurnstile } from '@api/server';

import { toNextJsHandler } from 'better-auth/next-js';

const betterAuth = toNextJsHandler(auth);

/**
 * Rate-limited GET handler for Better Auth (spray attack prevention).
 * 300 req/min per IP — generous enough for legitimate session checks
 * across rapid page navigation, but stops automated enumeration.
 */
export async function GET(request: Request) {
  const rateLimit = await rateLimitByIP(request, { windowMs: 60_000, maxRequests: 300 });
  if (rateLimit) return rateLimit;
  return betterAuth.GET(request);
}

/**
 * Rate-limited POST handler for Better Auth.
 * Limits to 10 POST requests per minute per IP.
 * Verifies Turnstile CAPTCHA token when provided via x-turnstile-token header
 * (high-risk sign-in attempts).
 */
export async function POST(request: Request) {
  const rateLimit = await rateLimitByIP(request, { windowMs: 60_000, maxRequests: 10 });
  if (rateLimit) return rateLimit;

  const turnstileToken = request.headers.get('x-turnstile-token');
  if (turnstileToken) {
    const isHuman = await verifyTurnstile(turnstileToken);
    if (!isHuman) {
      return new Response(JSON.stringify({ error: 'Bot verification failed. Please try again.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return betterAuth.POST(request);
}
