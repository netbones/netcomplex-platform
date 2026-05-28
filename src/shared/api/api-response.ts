import { NextResponse } from 'next/server';

// ─── Canonical Error Codes ────────────────────────────────────────────────

export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_REQUIRED: 'TENANT_REQUIRED',
  TENANT_FORBIDDEN: 'TENANT_FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  SUSPENDED_USER: 'SUSPENDED_USER',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// ─── Type Exports ─────────────────────────────────────────────────────────

export type CanonicalErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiPaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: ApiPaginatedMeta;
}

// ─── Response Builders ────────────────────────────────────────────────────

/**
 * Returns a success response with the canonical envelope.
 * If meta contains page/pageSize/total/hasMore, it's treated as paginated metadata.
 */
export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status: number = 200,
  init?: ResponseInit
): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = { success: true, data };
  if (meta !== undefined) {
    body.meta = meta;
  }
  const options: ResponseInit = { ...init, status };
  return NextResponse.json(body, options) as NextResponse<ApiSuccessResponse<T>>;
}

/**
 * Returns an error response with the canonical envelope.
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const error: ApiErrorResponse['error'] = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return NextResponse.json({ success: false, error }, { status }) as NextResponse<ApiErrorResponse>;
}

/**
 * Returns a paginated success response with canonical pagination metadata.
 */
export function apiPaginated<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): NextResponse<ApiPaginatedResponse<T>> {
  const hasMore = page * pageSize < total;
  return apiSuccess(data, { page, pageSize, total, hasMore } as unknown as Record<
    string,
    unknown
  >) as NextResponse<ApiPaginatedResponse<T>>;
}

/**
 * Returns a 201 Created response.
 */
export function apiCreated<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return apiSuccess(data, undefined, 201);
}

/**
 * Returns a 204 No Content response.
 */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ─── Convenience Error Wrappers ───────────────────────────────────────────

export function apiUnauthorized(message?: string): NextResponse<ApiErrorResponse> {
  return apiError(ERROR_CODES.AUTH_REQUIRED, message || 'Authentication required', 401);
}

export function apiForbidden(message?: string): NextResponse<ApiErrorResponse> {
  return apiError(ERROR_CODES.FORBIDDEN, message || 'Forbidden', 403);
}

export function apiTenantRequired(): NextResponse<ApiErrorResponse> {
  return apiError(ERROR_CODES.TENANT_REQUIRED, 'Tenant context required', 400);
}

export function apiTenantForbidden(): NextResponse<ApiErrorResponse> {
  return apiError(ERROR_CODES.TENANT_FORBIDDEN, 'Cross-tenant access denied', 403);
}

export function apiValidationError(details?: unknown): NextResponse<ApiErrorResponse> {
  return apiError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', 422, details);
}

export function apiNotFound(message?: string): NextResponse<ApiErrorResponse> {
  return apiError(ERROR_CODES.NOT_FOUND, message || 'Not found', 404);
}

export function apiSuspendedUser(details?: unknown): NextResponse<ApiErrorResponse> {
  return apiError(ERROR_CODES.SUSPENDED_USER, 'Account suspended', 403, details);
}

export function apiInternalError(message?: string): NextResponse<ApiErrorResponse> {
  return apiError(ERROR_CODES.INTERNAL_ERROR, message || 'Internal server error', 500);
}
