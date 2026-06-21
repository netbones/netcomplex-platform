import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((key: string) => {
        if (key === 'x-tenant-id') return 'test-tenant-id';
        if (key === 'x-tenant-slug') return 'test-tenant';
        return null;
      }),
    })
  ),
}));

const mocks = vi.hoisted(() => ({
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  uploadImageResult: { url: 'https://example.com/img.jpg', key: 'users/user-1/uuid.jpg' },
  authSession: { user: { id: 'user-1' } } as { user: { id: string } } | null,
  rateLimitResult: null as Response | null,
}));

vi.mock('@api/server', () => ({
  auth: { api: { getSession: vi.fn(() => Promise.resolve(mocks.authSession)) } },
  uploadImage: vi.fn(() => Promise.resolve(mocks.uploadImageResult)),
  rateLimitByIP: vi.fn(() => Promise.resolve(mocks.rateLimitResult)),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string, status = 500) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    () =>
      new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiInternalError: vi.fn(
    (message: string) =>
      new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
}));

import { POST } from '@/app/api/upload/route';

function makeFormData(file?: File): FormData {
  const fd = new FormData();
  if (file) fd.append('file', file);
  return fd;
}

function makeRequest(formData: FormData): Request {
  return new Request('http://localhost:3000/api/upload', {
    method: 'POST',
    headers: {
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
    },
    body: formData,
  });
}

describe('Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.authSession = { user: { id: 'user-1' } };
    mocks.rateLimitResult = null;
    mocks.uploadImageResult = { url: 'https://example.com/img.jpg', key: 'users/user-1/uuid.jpg' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mocks.authSession = null;
    const response = await POST(new Request('http://localhost:3000/api/upload', { method: 'POST' }) as any);
    const body = await response.json();

    expect(response.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    mocks.rateLimitResult = new Response(
      JSON.stringify({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );

    const response = await POST(new Request('http://localhost:3000/api/upload', { method: 'POST' }) as any);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
  });
});
