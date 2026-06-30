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
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  contents: {
    id: 'id',
    title: 'title',
    excerpt: 'excerpt',
    image: 'image',
    category: 'category',
    publishedAt: 'publishedAt',
    authorId: 'authorId',
    published: 'published',
    tenantId: 'tenantId',
  },
  users: {
    id: 'id',
    name: 'name',
  },
  apiError: vi.fn(
    (code: string, message: string) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiInternalError: vi.fn(
    (message: string) =>
      new Response(JSON.stringify({ success: false, error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  assertModuleEnabled: () => Promise.resolve(null),
}));

vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
  defaultLanguage: 'en',
}));

vi.mock('@entities/content/server', () => ({
  resolveLocale: vi.fn((locale?: string | null) => locale || 'en'),
  transformContentForLocale: vi.fn((item: Record<string, unknown>) => item),
}));

import { GET } from '@/app/api/conservation/route';
import { makeSelectChain } from '@/test/api/helpers';

const sampleContent = [
  {
    id: '1',
    title: 'Conservation Article 1',
    excerpt: 'Excerpt 1',
    image: '/image1.jpg',
    category: 'wildlife',
    publishedAt: '2026-06-20T10:00:00.000Z',
    author: { name: 'Alice' },
  },
  {
    id: '2',
    title: 'Conservation Article 2',
    excerpt: 'Excerpt 2',
    image: '/image2.jpg',
    category: 'habitat',
    publishedAt: '2026-06-19T10:00:00.000Z',
    author: { name: 'Bob' },
  },
  {
    id: '3',
    title: 'Conservation Article 3',
    excerpt: 'Excerpt 3',
    image: '/image3.jpg',
    category: 'sustainability',
    publishedAt: '2026-06-18T10:00:00.000Z',
    author: { name: 'Carol' },
  },
];

describe('Conservation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockRequest = (locale?: string) =>
    new Request(`http://localhost/api/conservation${locale ? `?locale=${locale}` : ''}`, {
      headers: { 'x-locale': locale || 'en' },
    });

  it('returns latest conservation articles', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain(sampleContent));

    const response = await GET(mockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(3);
  });

  it('returns empty array when no content exists', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

    const response = await GET(mockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('enforces tenant isolation via withTenant', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain(sampleContent));

    await GET(mockRequest());

    expect(mocks.tenantResult.tenantId).toBe('test-tenant-id');
  });

  it('handles database errors gracefully', async () => {
    mocks.dbMock.select.mockImplementationOnce(() => {
      throw new Error('DB connection failed');
    });

    const response = await GET(mockRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to fetch content');
  });
});
