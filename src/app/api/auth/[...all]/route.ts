import { auth } from '@api/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { rateLimitByIP } from '@api/rate-limit';

const betterAuth = toNextJsHandler(auth);

export const GET = betterAuth.GET;

/**
 * Rate-limited POST handler for Better Auth.
 * Limits to 10 POST requests per minute per IP.
 */
export async function POST(request: Request) {
  const rateLimit = rateLimitByIP(request, { windowMs: 60_000, maxRequests: 10 });
  if (rateLimit) return rateLimit;
  return betterAuth.POST(request);
}
