import { auth, rateLimitByIP } from '@api/server';

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
 */
export async function POST(request: Request) {
  const rateLimit = await rateLimitByIP(request, { windowMs: 60_000, maxRequests: 10 });
  if (rateLimit) return rateLimit;
  return betterAuth.POST(request);
}
