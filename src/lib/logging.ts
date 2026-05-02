import { createLogger, logger as defaultLogger } from '@shared/lib/logger';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

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
  return defaultLogger.child({ component });
}

/**
 * Log error with context - uses api logger as fallback
 * @deprecated Use createComponentLogger instead for cleaner code
 */
export function logError(context: LogContext, message: string, error?: unknown): void {
  const log = context.component
    ? defaultLogger.child({ component: context.component })
    : defaultLogger;
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
  const log = context.component
    ? defaultLogger.child({ component: context.component })
    : defaultLogger;
  log.warn(context, message);
}

/**
 * Log info with context
 * @deprecated Use createComponentLogger instead
 */
export function logInfo(context: LogContext, message: string): void {
  const log = context.component
    ? defaultLogger.child({ component: context.component })
    : defaultLogger;
  log.info(context, message);
}

/**
 * Log debug with context
 * @deprecated Use createComponentLogger instead
 */
export function logDebug(context: LogContext, message: string): void {
  const log = context.component
    ? defaultLogger.child({ component: context.component })
    : defaultLogger;
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
  const log = context.component
    ? defaultLogger.child({ component: context.component })
    : defaultLogger;
  return promise.catch(error => {
    log.error(
      { ...context, operation },
      `${operation} failed: ${error instanceof Error ? error.message : error}`
    );
    throw error;
  });
}
