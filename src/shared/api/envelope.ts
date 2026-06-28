import { z } from 'zod';
import { ERROR_CODES } from './api-response';
import type { CanonicalErrorCode } from './api-response';

export type { CanonicalErrorCode };

export function toEnvelopeSchema<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ success: z.literal(true), data: schema });
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: CanonicalErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiEnvelope<T> | ApiErrorEnvelope;

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export function toEnvelope<T>(data: T, meta?: Record<string, unknown>): ApiEnvelope<T> {
  const envelope: ApiEnvelope<T> = { success: true, data };
  if (meta) envelope.meta = meta;
  return envelope;
}

export function toPaginatedEnvelope<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): ApiEnvelope<T[]> {
  const hasMore = page * pageSize < total;
  return toEnvelope(data, { page, pageSize, total, hasMore });
}

export function toErrorEnvelope(
  code: CanonicalErrorCode,
  message: string,
  details?: unknown
): ApiErrorEnvelope {
  const error: ApiErrorEnvelope['error'] = { code, message };
  if (details !== undefined) error.details = details;
  return { success: false, error };
}

export const TRPC_TO_CANONICAL: Record<string, CanonicalErrorCode> = {
  UNAUTHORIZED: ERROR_CODES.AUTH_REQUIRED,
  FORBIDDEN: ERROR_CODES.FORBIDDEN,
  BAD_REQUEST: ERROR_CODES.VALIDATION_ERROR,
  NOT_FOUND: ERROR_CODES.NOT_FOUND,
  CONFLICT: ERROR_CODES.CONFLICT,
  TOO_MANY_REQUESTS: ERROR_CODES.RATE_LIMITED,
  INTERNAL_SERVER_ERROR: ERROR_CODES.INTERNAL_ERROR,
  PRECONDITION_FAILED: ERROR_CODES.TENANT_REQUIRED,
  METHOD_NOT_SUPPORTED: ERROR_CODES.VALIDATION_ERROR,
  TIMEOUT: ERROR_CODES.INTERNAL_ERROR,
  PAYLOAD_TOO_LARGE: ERROR_CODES.VALIDATION_ERROR,
  UNPROCESSABLE_CONTENT: ERROR_CODES.VALIDATION_ERROR,
};

export function tRPCCodeToCanonical(trpcCode: string): CanonicalErrorCode {
  return TRPC_TO_CANONICAL[trpcCode] ?? ERROR_CODES.INTERNAL_ERROR;
}
