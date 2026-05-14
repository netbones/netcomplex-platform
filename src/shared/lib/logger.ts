import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Pino logger configuration.
 *
 * IMPORTANT: pino-pretty transport uses worker threads which causes
 * "Cannot find module lib/worker.js" errors with Next.js bundler.
 *
 * Solution: Disable transport in all environments. Use pino's default
 * JSON output which is fast and doesn't require workers.
 *
 * For pretty logs in dev, pipe through pino-pretty externally:
 *   pnpm dev | pnpm exec pino-pretty
 */
export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  // Don't use transport - it causes bundling issues with Next.js
  // transport: undefined,
});

export function createLogger(name: string) {
  return logger.child({ component: name });
}

export const apiLogger = createLogger('api');
export const dbLogger = createLogger('database');
export const authLogger = createLogger('auth');
export const uploadLogger = createLogger('upload');
