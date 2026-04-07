import { apiLogger } from './logger';

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

export function logError(context: LogContext, message: string, error?: unknown): void {
  apiLogger.error(
    { ...context, error: error instanceof Error ? error.message : error },
    formatMessage(message, error)
  );
}

export function logWarn(context: LogContext, message: string): void {
  apiLogger.warn(context, message);
}

export function logInfo(context: LogContext, message: string): void {
  apiLogger.info(context, message);
}

export function logDebug(context: LogContext, message: string): void {
  apiLogger.debug(context, message);
}

export function logPromiseError(
  context: LogContext,
  operation: string,
  promise: Promise<unknown>
): Promise<unknown> {
  return promise.catch(error => {
    apiLogger.error(
      { ...context, operation },
      `${operation} failed: ${error instanceof Error ? error.message : error}`
    );
    throw error;
  });
}
