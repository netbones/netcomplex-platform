'use client';

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDeleteWithBody,
  ApiClientError,
} from '@/shared/api/http-client';

export interface QueryError extends Error {
  status?: number;
  details?: unknown;
}

export async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  let body: unknown;
  if (init?.body) {
    try {
      body = JSON.parse(String(init.body));
    } catch {
      body = init.body;
    }
  }

  try {
    let result: { data: T };
    if (method === 'POST') result = await apiPost<T>(url, body);
    else if (method === 'PATCH') result = await apiPatch<T>(url, body);
    else if (method === 'DELETE') result = await apiDeleteWithBody<T>(url, body);
    else result = await apiGet<T>(url);
    return result.data as T;
  } catch (e) {
    if (e instanceof ApiClientError) {
      const error = new Error(e.message) as QueryError;
      error.status = e.statusCode;
      error.details = e.details;
      throw error;
    }
    throw e;
  }
}

export async function sendJson<T>(url: string, init: RequestInit): Promise<T> {
  return fetchApi<T>(url, init);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCurrency(amount: number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'VERIFIED':
    case 'COMPLETED':
    case 'ACTIVE':
    case 'HEALTHY':
      return 'bg-emerald-100 text-emerald-700';
    case 'PENDING':
    case 'PROBATION':
    case 'IDLE':
    case 'MANUAL_REVIEW_REQUIRED':
      return 'bg-amber-100 text-amber-800';
    case 'SUSPENDED':
    case 'FAILED':
    case 'DEGRADED':
      return 'bg-rose-100 text-rose-700';
    case 'REFUNDED':
    case 'INVITATION_ONLY':
      return 'bg-slate-200 text-slate-700';
    case 'OPEN':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

const DD_STEP_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  IDENTITY: {
    border: 'border-l-indigo-400',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
  },
  SERVICE: {
    border: 'border-l-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  BACKGROUND: {
    border: 'border-l-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
};

export function ddStepColor(key: string) {
  return (
    DD_STEP_COLORS[key] ?? {
      border: 'border-l-gray-300',
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
    }
  );
}
