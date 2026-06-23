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
  dbMock: {
    select: vi.fn(),
  },
  authSession: null as { user: { id: string } } | null,
  listContentResult: [] as unknown[],
  createContentResult: null as unknown,
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.authSession)),
    },
  },
  users: { id: 'id', role: 'role' },
  revalidateContent: vi.fn(),
  apiCreated: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiForbidden: vi.fn(() => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  ),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  requireAssistScope: vi.fn(() => null),
}));
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@entities/content/server', () => ({
  listContent: vi.fn(() => Promise.resolve(mocks.listContentResult)),
  createContent: vi.fn(() => Promise.resolve(mocks.createContentResult)),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn(() => true),
  defaultLanguage: 'en',
}));

import { GET, POST } from '@/app/api/content/route';
import { makeSelectChain } from './helpers';

describe('Content API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { user: { id: 'user-1' } };
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.listContentResult = [];
    mocks.createContentResult = null;
    // Default: auth user lookup returns RESIDENT role
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('returns content list', async () => {
      mocks.listContentResult = [{ id: 'c-1', title: 'Article' }];

      const response = await GET(
        new Request('http://localhost:3000/api/content') as unknown as Request
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
    });

    it('passes category filter', async () => {
      const response = await GET(
        new Request('http://localhost:3000/api/content?category=CONSERVATION')
      );

      expect(response.status).toBe(200);
    });
  });

  describe('POST', () => {
    it('creates content', async () => {
      mocks.createContentResult = { id: 'c-new', title: 'New Article' };

      const response = await POST(
        new Request('http://localhost:3000/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: { en: 'New Article' },
            content: { en: 'Body text' },
            category: 'CONSERVATION',
          }),
        })
      );

      expect(response.status).toBe(201);
    });

    it('returns 401 without authentication', async () => {
      mocks.authSession = null;

      const response = await POST(
        new Request('http://localhost:3000/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: { en: 'Test' },
            content: { en: 'Test' },
            category: 'NEWS',
          }),
        })
      );

      expect(response.status).toBe(401);
    });
  });
});
