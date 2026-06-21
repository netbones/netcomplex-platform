import { createComponentLogger } from '@shared/lib';
import { apiInternalError, apiValidationError } from './api-response';
import { NextResponse } from 'next/server';

const log = createComponentLogger('api-error-handler');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<NextResponse> | NextResponse;

function isZodError(error: unknown): boolean {
  return (
    error != null &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
  );
}

export function withErrorHandler<T extends RouteHandler>(handler: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) => {
    try {
      return Promise.resolve(handler(...args));
    } catch (error) {
      if (isZodError(error)) {
        log.warn({ err: error }, 'Zod validation error in API route');
        return apiValidationError((error as { issues: unknown }).issues);
      }
      log.error({ err: error }, 'Unhandled API route error');
      return apiInternalError();
    }
  }) as T;
}
