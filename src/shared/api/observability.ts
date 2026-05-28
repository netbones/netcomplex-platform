import { apiLogger } from '@shared/lib';

/**
 * Generates or retrieves a request ID from the incoming request headers.
 * Falls back to generating a new UUID.
 */
export function getRequestId(): string {
  // In middleware context, use the x-request-id header set by middleware
  // In route context, generate a new one
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
}

/**
 * Structured log context builder for API requests.
 * Attaches requestId, tenantId, actorId, and route for consistent log correlation.
 */
export interface RequestLogContext {
  requestId: string;
  actorId?: string | null;
  tenantId?: string | null;
  tenantSlug?: string | null;
  route?: string;
  method?: string;
}

/**
 * Create a structured log context for the current request.
 * Call at the top of each route handler to enable correlated logging.
 */
export function createLogContext(opts: {
  requestId?: string;
  actorId?: string | null;
  tenantId?: string | null;
  tenantSlug?: string | null;
  route?: string;
  method?: string;
}): RequestLogContext {
  return {
    requestId: opts.requestId || getRequestId(),
    actorId: opts.actorId || null,
    tenantId: opts.tenantId || null,
    tenantSlug: opts.tenantSlug || null,
    route: opts.route,
    method: opts.method,
  };
}

/**
 * Timing helper — wraps an async operation with latency logging.
 */
export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>,
  logContext?: RequestLogContext
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    apiLogger.info({ ...logContext, duration: `${duration.toFixed(0)}ms`, label }, 'API request');
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    apiLogger.error(
      { ...logContext, duration: `${duration.toFixed(0)}ms`, label, err: error },
      'API error'
    );
    throw error;
  }
}
