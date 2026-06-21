import Redis from 'ioredis';
import { apiError, ERROR_CODES } from './api-response';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('rate-limit');

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const hostEnv = process.env.SUGA_REDIS_HTTPS_DOMAIN;
  const password = process.env.SUGA_REDIS_PASSWORD;
  if (!hostEnv || !password) return null;
  const host = hostEnv.replace(/^https?:\/\//, '').replace(/\/$/, '');
  try {
    redis = new Redis({
      host,
      port: Number(process.env.SUGA_REDIS_PORT) || 6379,
      password,
      tls: {},
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    redis.on('error', err => log.warn({}, 'Redis connection error (rate limiter degraded)', err));
  } catch (err) {
    log.error({}, 'Failed to create Redis client', err);
    return null;
  }
  return redis;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, maxRequests: 10 },
  signup: { windowMs: 3600_000, maxRequests: 3 },
  invitations: { windowMs: 60_000, maxRequests: 5 },
  messages: { windowMs: 60_000, maxRequests: 30 },
  notifications: { windowMs: 60_000, maxRequests: 60 },
  upload: { windowMs: 60_000, maxRequests: 10 },
};

export async function rateLimitByKey(
  key: string,
  config: RateLimitConfig
): Promise<ReturnType<typeof apiError> | null> {
  const client = getRedis();
  if (!client) return null;

  const redisKey = `ratelimit:${key}`;
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  try {
    const [[incrErr, count], [expireErr]] = (await client
      .multi()
      .incr(redisKey)
      .expire(redisKey, windowSeconds)
      .exec()) as [[Error | null, number], [Error | null, number]];

    if (incrErr || expireErr) {
      log.error({ key }, 'Redis rate limit error', incrErr || expireErr);
      return null;
    }

    if (count > config.maxRequests) {
      return apiError(ERROR_CODES.RATE_LIMITED, 'Too many requests. Please try again later.', 429);
    }

    return null;
  } catch (err) {
    log.error({ key }, 'Rate limit check failed, allowing request', err);
    return null;
  }
}

export function rateLimitByIP(
  request: Request,
  config: RateLimitConfig
): Promise<ReturnType<typeof apiError> | null> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return rateLimitByKey(`ip:${ip}`, config);
}

export function rateLimitByUser(
  userId: string,
  config: RateLimitConfig
): Promise<ReturnType<typeof apiError> | null> {
  return rateLimitByKey(`user:${userId}`, config);
}
