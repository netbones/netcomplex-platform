/* eslint-disable @typescript-eslint/no-explicit-any */
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
  authSession: null as { user: { id: string } } | null,
  mockFetch: vi.fn<(...args: unknown[]) => Promise<Response>>(),
  mockLogError: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: {
      api: {
        getSession: vi.fn(() => Promise.resolve(mocks.authSession)),
      },
    },
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
    withErrorHandler: (handler: any) => handler,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  logError: (...args: unknown[]) => mocks.mockLogError(...args),
}));

import { GET } from '@/app/api/user/tags/route';

describe('User Tags API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mocks.mockFetch);

    mocks.authSession = { user: { id: 'user-1' } };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GET /api/user/tags', () => {
    it('returns 401 without a session', async () => {
      mocks.authSession = null;

      const res = await GET(new Request('http://localhost/api/user/tags') as any);

      expect(res.status).toBe(401);
    });

    it('returns empty tags array when fetch fails (non-ok response)', async () => {
      mocks.mockFetch.mockResolvedValue(new Response(null, { status: 500 }));

      const res = await GET(new Request('http://localhost/api/user/tags') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({ tags: [] });
    });

    it('returns empty tags array when fetch returns 404', async () => {
      mocks.mockFetch.mockResolvedValue(new Response(null, { status: 404 }));

      const res = await GET(new Request('http://localhost/api/user/tags') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({ tags: [] });
    });

    it('returns sorted unique tags from user content', async () => {
      const contentItems = [
        { id: 'c1', tags: ['garden', 'plants'] },
        { id: 'c2', tags: ['garden', 'events'] },
        { id: 'c3', tags: ['plants', 'workshop'] },
        { id: 'c4', tags: [] },
        { id: 'c5' }, // no tags field
      ];
      mocks.mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: contentItems }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await GET(new Request('http://localhost/api/user/tags') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.tags).toEqual(['events', 'garden', 'plants', 'workshop']);
    });

    it('extracts tags from .data wrapper or direct array', async () => {
      const contentItems = [{ id: 'c1', tags: ['a', 'b'] }];
      // Response wraps data in .data already
      mocks.mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: contentItems }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await GET(new Request('http://localhost/api/user/tags') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.tags).toEqual(['a', 'b']);
    });

    it('handles response body that is a bare array (no .data wrapper)', async () => {
      const contentItems = [{ id: 'c1', tags: ['x', 'y', 'z'] }];
      mocks.mockFetch.mockResolvedValue(
        new Response(JSON.stringify(contentItems), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await GET(new Request('http://localhost/api/user/tags') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.tags).toEqual(['x', 'y', 'z']);
    });

    it('returns empty tags when no content has tags', async () => {
      mocks.mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await GET(new Request('http://localhost/api/user/tags') as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.tags).toEqual([]);
    });

    it('calls fetch with the correct authorId', async () => {
      mocks.mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await GET(new Request('http://localhost/api/user/tags') as any);

      expect(mocks.mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/content?authorId=user-1'),
        expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
      );
    });

    it('returns 500 on internal error and logs it', async () => {
      mocks.mockFetch.mockRejectedValue(new Error('Network failure'));

      const res = await GET(new Request('http://localhost/api/user/tags') as any as any);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect((body as any).success).toBe(false);
      expect(mocks.mockLogError).toHaveBeenCalled();
    });
  });
});
