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

interface LogContext {
  component?: string;
  [key: string]: unknown;
}

function formatMessage(message: string, error?: unknown): string {
  if (error instanceof Error) {
    return `${message}: ${error.message}`;
  }
  if (error) {
    return `${message}: ${String(error)}`;
  }
  return message;
}

/**
 * Create a child logger with a fixed component name.
 * Use this in modules to avoid repeating component name in every log call.
 *
 * @example
 * // In AdminStatsWidget.tsx
 * const log = createComponentLogger('AdminStatsWidget');
 *
 * log.error({ operation: 'fetchStats' }, 'Failed to fetch', error);
 */
export function createComponentLogger(component: string) {
  return logger.child({ component });
}

/**
 * Log error with context - uses api logger as fallback
 * @deprecated Use createComponentLogger instead for cleaner code
 */
export function logError(context: LogContext, message: string, error?: unknown): void {
  const log = context.component ? logger.child({ component: context.component }) : logger;
  log.error(
    { ...context, error: error instanceof Error ? error.message : error },
    formatMessage(message, error)
  );
}

/**
 * Log warning with context
 * @deprecated Use createComponentLogger instead
 */
export function logWarn(context: LogContext, message: string): void {
  const log = context.component ? logger.child({ component: context.component }) : logger;
  log.warn(context, message);
}

/**
 * Log info with context
 * @deprecated Use createComponentLogger instead
 */
export function logInfo(context: LogContext, message: string): void {
  const log = context.component ? logger.child({ component: context.component }) : logger;
  log.info(context, message);
}

/**
 * Log debug with context
 * @deprecated Use createComponentLogger instead
 */
export function logDebug(context: LogContext, message: string): void {
  const log = context.component ? logger.child({ component: context.component }) : logger;
  log.debug(context, message);
}

/**
 * Wrap a promise to log errors on rejection
 * @deprecated Use createComponentLogger instead
 */
export function logPromiseError(
  context: LogContext,
  operation: string,
  promise: Promise<unknown>
): Promise<unknown> {
  const log = context.component ? logger.child({ component: context.component }) : logger;
  return promise.catch(error => {
    log.error(
      { ...context, operation },
      `${operation} failed: ${error instanceof Error ? error.message : error}`
    );
    throw error;
  });
}
