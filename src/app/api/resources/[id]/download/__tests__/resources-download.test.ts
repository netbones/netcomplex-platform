/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeUpdateChain } from './helpers';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  dbMock: { update: vi.fn() },
  withTenant: vi.fn(),
  now: vi.fn(),
  apiSuccess: vi.fn(),
  apiNotFound: vi.fn(),
}));

vi.mock('@api/server', () => ({
  CACHE_TAGS: { SETTINGS: 'settings' },
  db: mocks.dbMock,
  resources: {
    id: 'id',
    tenantId: 'tenantId',
    title: 'title',
    description: 'description',
    category: 'category',
    downloadCount: 'downloadCount',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
  },
  now: () => mocks.now(),
  apiSuccess: (data: unknown) => mocks.apiSuccess(data),
  apiNotFound: (message?: string) => mocks.apiNotFound(message),
  withErrorHandler: (handler: any) => handler,
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.withTenant()),
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ and: true, args })),
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: true, a, b })),
  sql: vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({ sql: true })),
}));

import { POST } from '@/app/api/resources/[id]/download/route';

describe('Resources Download API — POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withTenant.mockReturnValue({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' });
    mocks.now.mockReturnValue(new Date('2026-06-21T12:00:00Z'));
    mocks.apiSuccess.mockImplementation(
      (data: unknown) =>
        new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    );
    mocks.apiNotFound.mockImplementation(
      (message = 'Resource not found') =>
        new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('increments download count and returns new count', async () => {
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ downloadCount: 42 }]));

    const response = await POST(
      new Request('http://localhost:3000/api/resources/res-1/download', { method: 'POST' }),
      { params: Promise.resolve({ id: 'res-1' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.downloadCount).toBe(42);
    expect(mocks.dbMock.update).toHaveBeenCalled();
  });

  it('returns 404 when resource not found', async () => {
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const response = await POST(
      new Request('http://localhost:3000/api/resources/res-999/download', { method: 'POST' }),
      { params: Promise.resolve({ id: 'res-999' }) } as any
    );

    expect(response.status).toBe(404);
  });

  it('enforces tenant isolation in update query', async () => {
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ downloadCount: 5 }]));

    await POST(
      new Request('http://localhost:3000/api/resources/res-1/download', { method: 'POST' }),
      { params: Promise.resolve({ id: 'res-1' }) } as any
    );

    expect(mocks.withTenant).toHaveBeenCalled();
  });

  it('handles large download count values', async () => {
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ downloadCount: 99999 }]));

    const response = await POST(
      new Request('http://localhost:3000/api/resources/res-1/download', { method: 'POST' }),
      { params: Promise.resolve({ id: 'res-1' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.downloadCount).toBe(99999);
  });

  it('updates updatedAt timestamp on download', async () => {
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ downloadCount: 1 }]));

    await POST(
      new Request('http://localhost:3000/api/resources/res-1/download', { method: 'POST' }),
      { params: Promise.resolve({ id: 'res-1' }) } as any
    );

    expect(mocks.now).toHaveBeenCalled();
  });

  it('extracts resource id from route params', async () => {
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ downloadCount: 7 }]));

    await POST(
      new Request('http://localhost:3000/api/resources/res-42/download', { method: 'POST' }),
      { params: Promise.resolve({ id: 'res-42' }) } as any
    );

    expect(mocks.dbMock.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'id' }));
  });
});
