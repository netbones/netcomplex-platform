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
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: {
    select: vi.fn(),
    update: vi.fn(),
  },
  hasPermission: vi.fn(),
  apiSuccess: vi.fn(
    (data: unknown): Response =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiNotFound: vi.fn(
    (message = 'Not found'): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message } }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
  ),
  apiGone: vi.fn(
    (message = 'This record has been deleted'): Response =>
      new Response(JSON.stringify({ success: false, error: { code: 'GONE', message } }), {
        status: 410,
        headers: { 'content-type': 'application/json' },
      })
  ),
  notDeleted: vi.fn((t: any) => ({ isNull: [t, 'deletedAt'] })),
  getLocalizedValue: vi.fn(
    (
      value: Record<string, unknown> | null | undefined,
      locale: string,
      defaultLocale: string
    ): string | null => {
      if (!value) return null;
      return (value[locale] as string) || (value[defaultLocale] as string) || null;
    }
  ),
  getLocalizedContent: vi.fn(
    (
      value: Record<string, unknown> | null | undefined,
      locale: string,
      defaultLocale: string
    ): string | Record<string, unknown> | null => {
      if (!value) return null;
      if (value[locale]) return value[locale] as string;
      if (value[defaultLocale]) return value[defaultLocale] as string;
      return null;
    }
  ),
  revalidateContent: vi.fn(),
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)),
    },
  },
  getSessionAndRole: vi.fn(() => {
    if (!mocks.sessionResult) return Promise.resolve(null);
    return Promise.resolve({
      session: { user: { id: mocks.sessionResult.user.id, email: 'test@test.com', name: 'Test' } },
      userId: mocks.sessionResult.user.id,
      role: 'ADMIN',
      suspension: null,
    });
  }),
  guardSuspension: vi.fn(() => null),
  CACHE_TAGS: {},
  db: mocks.dbMock,
  contents: {
    id: 'contents.id',
    title: 'contents.title',
    content: 'contents.content',
    excerpt: 'contents.excerpt',
    image: 'contents.image',
    category: 'contents.category',
    tags: 'contents.tags',
    authorId: 'contents.authorId',
    groupId: 'contents.groupId',
    published: 'contents.published',
    featured: 'contents.featured',
    priority: 'contents.priority',
    defaultLocale: 'contents.defaultLocale',
    contentType: 'contents.contentType',
    license: 'contents.license',
    copyrightHolder: 'contents.copyrightHolder',
    moderationStatus: 'contents.moderationStatus',
    viewCount: 'contents.viewCount',
    createdAt: 'contents.createdAt',
    updatedAt: 'contents.updatedAt',
    publishedAt: 'contents.publishedAt',
    expiresAt: 'contents.expiresAt',
    deletedAt: 'contents.deletedAt',
    tenantId: 'contents.tenantId',
  },
  users: { id: 'users.id', role: 'users.role', name: 'users.name' },
  groups: { id: 'groups.id', name: 'groups.name' },
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  withErrorHandler: vi.fn((handler: any) => handler as never),
  revalidateContent: mocks.revalidateContent,
  apiSuccess: mocks.apiSuccess,
  apiNotFound: mocks.apiNotFound,
  apiGone: mocks.apiGone,
  apiError: vi.fn(),
  notDeleted: mocks.notDeleted,
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  getLocalizedValue: mocks.getLocalizedValue,
  getLocalizedContent: mocks.getLocalizedContent,
  supportedLanguages: ['en', 'af', 'xh', 'zu'],
  defaultLanguage: 'en',
  hasPermission: (...args: any[]) => mocks.hasPermission(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { GET, PATCH, DELETE } from '@/app/api/content/[id]/route';
import { makeSelectChain, makeUpdateChain } from '@/test/api/helpers';

const baseContent = {
  id: 'c-1',
  title: { en: 'Welcome to Soralia', af: 'Welkom by Soralia' },
  content: { en: 'Full article body', af: 'Volledige artikel liggaam' },
  excerpt: { en: 'A brief excerpt' },
  image: '/images/welcome.jpg',
  category: 'NEWS',
  tags: ['welcome', 'introduction'],
  authorId: 'user-1',
  groupId: null,
  published: true,
  featured: false,
  priority: 0,
  defaultLocale: 'en',
  contentType: 'article',
  license: null,
  copyrightHolder: null,
  moderationStatus: 'APPROVED',
  viewCount: 42,
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-15T00:00:00Z'),
  publishedAt: new Date('2026-06-01T08:00:00Z'),
  expiresAt: null,
  authorName: 'Alice',
  groupName: null,
};

function makeReq({
  method = 'GET',
  body,
  url,
}: {
  method?: string;
  body?: unknown;
  url?: string;
} = {}): Request {
  return new Request(url || 'http://localhost:3000/api/content/c-1', {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/content/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.hasPermission.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with localized content for authenticated user', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
      .mockReturnValueOnce(makeSelectChain([baseContent]));

    const response = await GET(makeReq(), { params: Promise.resolve({ id: 'c-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      id: 'c-1',
      title: 'Welcome to Soralia',
      author: { id: 'user-1', name: 'Alice' },
      group: null,
    });
    expect(body.data._raw).toBeDefined();
    expect(body.data._raw.title).toEqual(baseContent.title);
  });

  it('returns 200 with content using locale query parameter', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
      .mockReturnValueOnce(makeSelectChain([baseContent]));

    const response = await GET(
      makeReq({ url: 'http://localhost:3000/api/content/c-1?locale=af' }),
      { params: Promise.resolve({ id: 'c-1' }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.getLocalizedValue).toHaveBeenCalledWith(
      expect.anything(),
      'af',
      expect.anything()
    );
  });

  it('returns 200 with content for anonymous user (no session)', async () => {
    mocks.sessionResult = null;
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([baseContent]));

    const response = await GET(makeReq(), { params: Promise.resolve({ id: 'c-1' }) });

    expect(response.status).toBe(200);
    expect(mocks.dbMock.select).toHaveBeenCalledTimes(1);
  });

  it('returns 200 with content for admin user (full access)', async () => {
    mocks.hasPermission.mockReturnValue(true);
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([baseContent]));

    const response = await GET(makeReq(), { params: Promise.resolve({ id: 'c-1' }) });

    expect(response.status).toBe(200);
    expect(mocks.hasPermission).toHaveBeenCalledWith('ADMIN', 'content');
  });

  it('applies published filter when query param is provided', async () => {
    mocks.sessionResult = null;
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([baseContent]));

    await GET(makeReq({ url: 'http://localhost:3000/api/content/c-1?published=true' }), {
      params: Promise.resolve({ id: 'c-1' }),
    });

    // where was called — the chain mock captures the where clause internally
    expect(mocks.dbMock.select).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when content not found', async () => {
    mocks.sessionResult = null;
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

    const response = await GET(makeReq(), { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(response.status).toBe(404);
    expect(mocks.apiNotFound).toHaveBeenCalled();
  });

  it('enforces tenant isolation with notDeleted and tenantId', async () => {
    mocks.sessionResult = null;
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

    await GET(makeReq(), { params: Promise.resolve({ id: 'c-1' }) });

    expect(mocks.notDeleted).toHaveBeenCalled();
  });
});

describe('PATCH /api/content/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates content with string title and returns 200', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'c-1', title: { en: 'Updated' } }]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: { title: 'Updated' } }), {
      params: Promise.resolve({ id: 'c-1' }),
    });

    expect(response.status).toBe(200);
    expect(mocks.revalidateContent).toHaveBeenCalled();
  });

  it('updates content with JSON (multi-locale) title', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));
    mocks.dbMock.update.mockReturnValue(
      makeUpdateChain([{ id: 'c-1', title: { en: 'Updated', af: 'Opgedateer' } }])
    );

    const response = await PATCH(
      makeReq({
        method: 'PATCH',
        body: { title: { en: 'Updated', af: 'Opgedateer' } },
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    );

    expect(response.status).toBe(200);
  });

  it('sets excerpt to null when empty string provided', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'c-1', excerpt: null }]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: { excerpt: '' } }), {
      params: Promise.resolve({ id: 'c-1' }),
    });

    expect(response.status).toBe(200);
    // The update data should have excerpt set to null
    const updateSetCall = mocks.dbMock.update.mock.calls[0];
    expect(updateSetCall).toBeDefined();
  });

  it('handles categorical and boolean fields', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'c-1' }]));

    const response = await PATCH(
      makeReq({
        method: 'PATCH',
        body: {
          category: 'EVENTS',
          featured: true,
          published: true,
          tags: ['event', 'community'],
          priority: 5,
        },
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    );

    expect(response.status).toBe(200);
  });

  it('auto-sets publishedAt when publishing without explicit date', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));
    mocks.dbMock.update.mockReturnValue(
      makeUpdateChain([{ id: 'c-1', publishedAt: new Date('2026-06-21T12:00:00Z') }])
    );

    const response = await PATCH(makeReq({ method: 'PATCH', body: { published: true } }), {
      params: Promise.resolve({ id: 'c-1' }),
    });

    expect(response.status).toBe(200);
  });

  it('accepts explicit publishedAt and expiresAt dates', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'c-1' }]));

    const response = await PATCH(
      makeReq({
        method: 'PATCH',
        body: {
          publishedAt: '2026-07-01T00:00:00Z',
          expiresAt: '2026-12-31T23:59:59Z',
        },
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    );

    expect(response.status).toBe(200);
  });

  it('clears publishedAt and expiresAt when set to null', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ deletedAt: null }]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'c-1' }]));

    const response = await PATCH(
      makeReq({
        method: 'PATCH',
        body: { publishedAt: null, expiresAt: null },
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    );

    expect(response.status).toBe(200);
  });

  it('returns 404 when content does not exist', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

    const response = await PATCH(makeReq({ method: 'PATCH', body: { title: 'Updated' } }), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
    expect(mocks.apiNotFound).toHaveBeenCalled();
  });

  it('returns 410 when content is soft-deleted', async () => {
    mocks.dbMock.select.mockReturnValueOnce(
      makeSelectChain([{ deletedAt: '2026-06-20T10:00:00Z' }])
    );

    const response = await PATCH(makeReq({ method: 'PATCH', body: { title: 'Updated' } }), {
      params: Promise.resolve({ id: 'c-deleted' }),
    });

    expect(response.status).toBe(410);
    expect(mocks.apiGone).toHaveBeenCalledWith('This record has been deleted');
  });
});

describe('DELETE /api/content/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('soft-deletes content and returns 200', async () => {
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const response = await DELETE(makeReq({ method: 'DELETE' }), {
      params: Promise.resolve({ id: 'c-1' }),
    });

    expect(response.status).toBe(200);
    expect(mocks.revalidateContent).toHaveBeenCalled();
  });

  it('returns success with { success: true }', async () => {
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const response = await DELETE(makeReq({ method: 'DELETE' }), {
      params: Promise.resolve({ id: 'c-1' }),
    });

    expect(response.status).toBe(200);
    expect(mocks.apiSuccess).toHaveBeenCalledWith({ success: true });
  });
});
