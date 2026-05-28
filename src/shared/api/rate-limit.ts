/**
 * In-memory rate limiting helper for API routes.
 *
 * Uses a Map-based store (single-instance only).
 * For multi-instance deployments, replace with Redis via the same interface.
 *
 * TODO: Replace in-memory store with Redis for multi-instance production use.
 */

import { apiError, ERROR_CODES } from './api-response';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 60_000);
}

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests per window */
  maxRequests: number;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, maxRequests: 10 }, // 10 req/min for auth
  signup: { windowMs: 3600_000, maxRequests: 3 }, // 3 req/hour for signup
  invitations: { windowMs: 60_000, maxRequests: 5 }, // 5 req/min for invitations
  messages: { windowMs: 60_000, maxRequests: 30 }, // 30 req/min for messages
  notifications: { windowMs: 60_000, maxRequests: 60 }, // 60 req/min for notifications
  upload: { windowMs: 60_000, maxRequests: 10 }, // 10 req/min for uploads
};

/**
 * Rate limit a request by an arbitrary key (typically IP or user ID).
 * Returns a NextResponse with RATE_LIMITED error if exceeded, null otherwise.
 */
export function rateLimitByKey(
  key: string,
  config: RateLimitConfig
): ReturnType<typeof apiError> | null {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return apiError(ERROR_CODES.RATE_LIMITED, 'Too many requests. Please try again later.', 429);
  }

  return null;
}

/**
 * Rate limit by IP address from the request headers.
 */
export function rateLimitByIP(
  request: Request,
  config: RateLimitConfig
): ReturnType<typeof apiError> | null {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return rateLimitByKey(`ip:${ip}`, config);
}

/**
 * Rate limit by authenticated user ID.
 */
export function rateLimitByUser(
  userId: string,
  config: RateLimitConfig
): ReturnType<typeof apiError> | null {
  return rateLimitByKey(`user:${userId}`, config);
}
