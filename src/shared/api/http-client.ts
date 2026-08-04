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

const PUBLIC_PATH_PREFIXES = ['/api/auth/', '/api/invitations/'];

function shouldSkipAuth(path: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
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

export interface ApiRequestOptions {
  /** Skip attaching the Authorization header. Use for /api/auth/* and other public endpoints where a stale token could leak. */
  skipAuth?: boolean;
  /** Forwarded to fetch(). Defaults to 'include' so Better-Auth cookies and cross-origin tokens reach the server. */
  credentials?: RequestCredentials;
  /** Forwarded to fetch(). Defaults to 'no-store' so admin mutations do not read stale data. */
  cache?: RequestCache;
  /** Skip JSON Content-Type for multipart uploads (use apiPostForm instead). Set raw.contentType to a non-empty value to override the auto-detected browser Content-Type. */
  raw?: { contentType?: string; body: BodyInit };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>,
  options: ApiRequestOptions = {}
): Promise<ApiResult<T>> {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  if (options.raw) {
    const headers: Record<string, string> = {};
    if (!options.skipAuth) Object.assign(headers, await getAuthHeaders());
    const requestId = await getRequestId();
    if (requestId) headers['X-Request-Id'] = requestId;
    if (options.raw.contentType) headers['Content-Type'] = options.raw.contentType;

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: options.raw.body,
      credentials: options.credentials ?? 'include',
      cache: options.cache ?? 'no-store',
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

    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
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

    return { data: (await res.text()) as unknown as T };
  }

  const skipAuth = options.skipAuth ?? shouldSkipAuth(path);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(skipAuth ? {} : await getAuthHeaders()),
  };
  const requestId = await getRequestId();
  if (requestId) headers['X-Request-Id'] = requestId;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: options.credentials ?? 'include',
    cache: options.cache ?? 'no-store',
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

export function apiGet<T>(
  path: string,
  params?: Record<string, string>,
  options?: ApiRequestOptions
): Promise<ApiResult<T>> {
  return request<T>('GET', path, undefined, params, options);
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<ApiResult<T>> {
  return request<T>('POST', path, body, undefined, options);
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<ApiResult<T>> {
  return request<T>('PATCH', path, body, undefined, options);
}

export function apiPut<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<ApiResult<T>> {
  return request<T>('PUT', path, body, undefined, options);
}

export function apiDelete<T>(path: string, options?: ApiRequestOptions): Promise<ApiResult<T>> {
  return request<T>('DELETE', path, undefined, undefined, options);
}

/**
 * DELETE with a JSON body. Use sparingly — RFC 9110 discourages DELETE bodies, but some
 * internal endpoints (/api/seats) accept the entity to delete in the body.
 */
export function apiDeleteWithBody<T>(
  path: string,
  body: unknown,
  options?: ApiRequestOptions
): Promise<ApiResult<T>> {
  return request<T>('DELETE', path, body, undefined, options);
}

/**
 * Multipart/form-data upload. Uses apiPost under the hood but bypasses JSON Content-Type
 * and lets the browser set the multipart boundary. Centralizes auth header + error wrapping
 * for the 6+ upload sites that previously bypassed the http-client.
 */
export function apiPostForm<T>(
  path: string,
  formData: FormData,
  options: Omit<ApiRequestOptions, 'raw'> = {}
): Promise<ApiResult<T>> {
  return request<T>('POST', path, undefined, undefined, {
    ...options,
    raw: { contentType: '', body: formData },
  });
}

/**
 * Binary download (e.g., PDF, image). Returns the response with the auth header applied.
 * The caller is responsible for reading the blob/stream; this avoids the JSON-envelope path.
 */
export async function apiFetchRaw(
  path: string,
  options: ApiRequestOptions & { method?: string } = {}
): Promise<Response> {
  const url = new URL(path, window.location.origin);
  const skipAuth = options.skipAuth ?? shouldSkipAuth(path);
  const headers: Record<string, string> = {
    ...(skipAuth ? {} : await getAuthHeaders()),
  };
  const requestId = await getRequestId();
  if (requestId) headers['X-Request-Id'] = requestId;

  return fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    credentials: options.credentials ?? 'include',
    cache: options.cache ?? 'no-store',
  });
}

/**
 * Download a binary blob with centralized auth + error wrapping. Throws ApiClientError
 * for non-2xx so callers only handle the success path.
 */
export async function apiDownloadBlob(
  path: string,
  options: ApiRequestOptions = {}
): Promise<Blob> {
  const res = await apiFetchRaw(path, options);
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
  return res.blob();
}
