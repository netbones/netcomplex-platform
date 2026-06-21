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
  users: {
    id: 'id',
    name: 'name',
    avatar: 'avatar',
  },
  contents: {
    id: 'id',
    title: 'title',
    content: 'content',
    excerpt: 'excerpt',
    image: 'image',
    category: 'category',
    publishedAt: 'publishedAt',
    featured: 'featured',
    priority: 'priority',
    defaultLocale: 'defaultLocale',
    published: 'published',
    authorId: 'authorId',
    tenantId: 'tenantId',
  },
  settings: { key: 'key', value: 'value', tenantId: 'tenantId' },
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status: 500,
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
  withTenantOptional: () => Promise.resolve(mocks.tenantResult),
}));

import { GET } from '@/app/api/campaign/route';
import { makeSelectChain } from './helpers';

describe('Campaign API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default config and empty content when no tenant context', async () => {
    mocks.tenantResult = { tenantId: null as unknown as string, tenantSlug: null as unknown as string };

    const response = await GET(undefined as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.config).toEqual({
      linkLabel: { en: 'Campaign', af: 'Veldtog', xh: 'Icampaign', zu: 'I-Campaign' },
      pageTitle: { en: 'Campaign', af: 'Veldtog', xh: 'Icampaign', zu: 'I-Campaign' },
      pageDescription: {
        en: 'Support our community campaign',
        af: 'Ondersteun ons gemeenskap se veldtog',
        xh: 'Uxhaso lomphefumlo wethu',
        zu: 'Sisekela umcamango weqembu lethu',
      },
      contentCategory: 'CAMPAIGN',
    });
    expect(body.data.content).toEqual([]);
  });

  it('returns campaign with settings and content for tenant', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(
        makeSelectChain([
          { key: 'campaignLinkLabel', value: JSON.stringify({ en: 'Join Us', af: 'Sluit Aan' }) },
          { key: 'campaignPageTitle', value: JSON.stringify({ en: 'Our Campaign', af: 'Ons Veldtog' }) },
          {
            key: 'campaignPageDescription',
            value: JSON.stringify({ en: 'Help us grow', af: 'Help ons groei' }),
          },
          { key: 'campaignCategory', value: 'CONSERVATION' },
        ])
      )
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: '1',
            title: 'Campaign Post',
            content: '<p>Content</p>',
            excerpt: 'Excerpt text',
            image: '/img.jpg',
            category: 'CONSERVATION',
            publishedAt: new Date('2026-06-01'),
            featured: true,
            priority: 1,
            defaultLocale: 'en',
            author: { id: 'u1', name: 'Alice', avatar: null },
          },
        ])
      );

    const response = await GET(undefined as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.config.linkLabel).toEqual({ en: 'Join Us', af: 'Sluit Aan' });
    expect(body.data.config.contentCategory).toBe('CONSERVATION');
    expect(body.data.content).toHaveLength(1);
    expect(body.data.content[0].title).toBe('Campaign Post');
    expect(body.data.content[0].author.name).toBe('Alice');
  });

  it('uses defaults and returns empty content when tenant has no settings', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const response = await GET(undefined as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.config.linkLabel).toEqual({
      en: 'Campaign',
      af: 'Veldtog',
      xh: 'Icampaign',
      zu: 'I-Campaign',
    });
    expect(body.data.config.contentCategory).toBe('CAMPAIGN');
    expect(body.data.content).toEqual([]);
  });
});
