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

const mocks: {
  tenantResult: { tenantId: string; tenantSlug: string };
  sessionResult: { user: { id: string } } | null;
  images: { id: string; url: string; key: string }[];
} = vi.hoisted(() => ({
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  sessionResult: { user: { id: 'test-user-id' } },
  images: [{ id: 'img-1', url: 'https://example.com/img1.jpg', key: 'img-1-key' }],
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)),
    },
  },
  listUserImages: vi.fn(() => Promise.resolve(mocks.images)),
  deleteImage: vi.fn(() => Promise.resolve({ error: null })),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string, status?: number) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status: status ?? 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    () =>
      new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }), {
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

import { GET, DELETE } from '@/app/api/media/route';

function makeMediaRequest(method = 'GET', searchParams = '') {
  const url = searchParams
    ? `http://localhost:3000/api/media?${searchParams}`
    : 'http://localhost:3000/api/media';
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
    },
  });
}

describe('Media API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.sessionResult = { user: { id: 'test-user-id' } };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('returns user images', async () => {
      const response = await GET(makeMediaRequest('GET'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual({ images: mocks.images });
    });

    it('returns 401 when not authenticated', async () => {
      mocks.sessionResult = null;

      const response = await GET(makeMediaRequest('GET'));

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE', () => {
    it('deletes image with valid key', async () => {
      const response = await DELETE(makeMediaRequest('DELETE', 'key=img-1-key'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual({ success: true });
    });

    it('returns 400 when no key provided', async () => {
      const response = await DELETE(makeMediaRequest('DELETE'));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toEqual({ code: 'VALIDATION_ERROR', message: 'No key provided' });
    });

    it('returns 401 when not authenticated', async () => {
      mocks.sessionResult = null;

      const response = await DELETE(makeMediaRequest('DELETE', 'key=img-1-key'));

      expect(response.status).toBe(401);
    });
  });
});
