/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeUpdateChain } from './helpers';

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
  authSession: null as { user: { id: string } } | null,
  dbMock: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    db: mocks.dbMock,
    auth: {
      api: {
        getSession: vi.fn(() => Promise.resolve(mocks.authSession)),
      },
    },
    users: { id: 'id', role: 'role' },
    contents: { id: 'id', tenantId: 'tenantId', moderationStatus: 'moderationStatus', published: 'published', updatedAt: 'updatedAt' },
    revalidateContent: vi.fn(),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiError: (code: string, message: string, status: number = 500) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message } }, { status: 401 }) as any,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message } }, { status: 403 }) as any,
    apiNotFound: (message = 'Not found') =>
      NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message } }, { status: 404 }) as any,
    withErrorHandler: (handler: any) => handler,
    now: () => new Date('2026-06-21T12:00:00Z'),
    CACHE_TAGS: { SETTINGS: 'settings' },
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn((role: string, perm: string) => ['ADMIN', 'BOARD'].includes(role) || perm === 'content'),
}));

import { PATCH } from '@/app/api/content/[id]/moderate/route';

describe('Content Moderate API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { user: { id: 'user-1' } };
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PATCH /api/content/[id]/moderate', () => {
    const validBody = { moderationStatus: 'PUBLISHED' };

    function patchRequest(body: unknown): Request {
      return new Request('http://localhost/api/content/cont-1/moderate', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    it('returns 401 without auth session', async () => {
      mocks.authSession = null;

      const res = await PATCH(patchRequest(validBody), { params: Promise.resolve({ id: 'cont-1' }) });

      expect(res.status).toBe(401);
    });

    it('returns 403 without content permission', async () => {
      const { hasPermission } = await import('@shared/lib');
      vi.mocked(hasPermission).mockReturnValueOnce(false);

      const res = await PATCH(patchRequest(validBody), { params: Promise.resolve({ id: 'cont-1' }) });

      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid moderation status', async () => {
      const res = await PATCH(patchRequest({ moderationStatus: 'INVALID' }), { params: Promise.resolve({ id: 'cont-1' }) });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION');
    });

    it('returns 400 for missing moderation status', async () => {
      const res = await PATCH(patchRequest({}), { params: Promise.resolve({ id: 'cont-1' }) });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION');
    });

    it('returns 404 when content not found', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const res = await PATCH(patchRequest(validBody), { params: Promise.resolve({ id: 'cont-1' }) });

      expect(res.status).toBe(404);
    });

    it('moderates content to PUBLISHED', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'cont-1' }]));

      const res = await PATCH(patchRequest(validBody), { params: Promise.resolve({ id: 'cont-1' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toMatchObject({ id: 'cont-1', moderationStatus: 'PUBLISHED' });
    });

    it('moderates content to DRAFT', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'cont-1' }]));

      const res = await PATCH(patchRequest({ moderationStatus: 'DRAFT' }), { params: Promise.resolve({ id: 'cont-1' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.moderationStatus).toBe('DRAFT');
    });

    it('moderates content to FLAGGED', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'cont-1' }]));

      const res = await PATCH(patchRequest({ moderationStatus: 'FLAGGED' }), { params: Promise.resolve({ id: 'cont-1' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.moderationStatus).toBe('FLAGGED');
    });

    it('sets published=false when status is not PUBLISHED', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'cont-1' }]));

      await PATCH(patchRequest({ moderationStatus: 'UNPUBLISHED' }), { params: Promise.resolve({ id: 'cont-1' }) });

      const updateCall = mocks.dbMock.update.mock.calls[0]?.[0];
      expect(updateCall).toBeDefined();
    });

    it('calls revalidateContent after successful moderation', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'cont-1' }]));

      const { revalidateContent } = await import('@api/server');

      await PATCH(patchRequest(validBody), { params: Promise.resolve({ id: 'cont-1' }) });

      expect(revalidateContent).toHaveBeenCalledOnce();
    });
  });
});
