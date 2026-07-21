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
  sessionResult: null as { user: { id: string } } | null,
}));

vi.mock('@api/server', () => ({
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    () =>
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
  ),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  getSessionAndRole: vi.fn(() => Promise.resolve(mocks.sessionResult)),
  guardSuspension: vi.fn(() => null),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

describe('v1 stub routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/tenant/dwallet/statement', () => {
    it('returns 401 without auth', async () => {
      mocks.sessionResult = null;
      const { GET } = await import('@/app/api/v1/tenant/dwallet/statement/route');
      const response = await GET(
        new Request('http://localhost:3000/api/v1/tenant/dwallet/statement')
      );
      expect(response.status).toBe(401);
    });

    it('returns placeholder message when authenticated', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      const { GET } = await import('@/app/api/v1/tenant/dwallet/statement/route');
      const response = await GET(
        new Request('http://localhost:3000/api/v1/tenant/dwallet/statement')
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('Annual statement generation');
    });
  });

  describe('community-services/reviews', () => {
    it('GET returns empty list', async () => {
      const { GET } = await import('@/app/api/v1/tenant/community-services/reviews/route');
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('POST returns 501 not implemented', async () => {
      const { POST } = await import('@/app/api/v1/tenant/community-services/reviews/route');
      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(501);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_IMPLEMENTED');
    });
  });
});
