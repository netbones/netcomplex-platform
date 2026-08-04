'use client';

import { authClient } from './auth-client';
import type { ApiErrorResponse } from './api-response';

export interface ApiResult<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await authClient.getSession();
  if (session?.data?.session?.token) {
    return { Authorization: `Bearer ${session.data.session.token}` };
  }
  return {};
}

async function getRequestId(): Promise<string | undefined> {
  try {
    const { getRequestId } = await import('./observability');
    return getRequestId();
  } catch {
    return undefined;
  }
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>
): Promise<ApiResult<T>> {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await getAuthHeaders()),
  };
  const requestId = await getRequestId();
  if (requestId) headers['X-Request-Id'] = requestId;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorBody: ApiErrorResponse | null = null;
    try {
      errorBody = (await res.json()) as ApiErrorResponse;
    } catch {
      // Response body is not valid JSON
    }
    const error = errorBody?.error;
    throw new ApiClientError(
      res.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? `Request failed with status ${res.status}`,
      error?.details
    );
  }

  if (res.status === 204) {
    return { data: undefined as unknown as T };
  }

  const json = (await res.json()) as ApiEnvelope<T> | T;

  if (
    json &&
    typeof json === 'object' &&
    'success' in json &&
    'data' in json &&
    json.success === true
  ) {
    const envelope = json as ApiEnvelope<T>;
    return { data: envelope.data, meta: envelope.meta };
  }

  return { data: json as T };
}

export function apiGet<T>(path: string, params?: Record<string, string>): Promise<ApiResult<T>> {
  return request<T>('GET', path, undefined, params);
}

export function apiPost<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>('POST', path, body);
}

export function apiPatch<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>('PATCH', path, body);
}

export function apiPut<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>('PUT', path, body);
}

export function apiDelete<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>('DELETE', path, body);
}
