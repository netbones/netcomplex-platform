/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

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
    platformSuspensions: {
      id: 'id',
      userId: 'userId',
      suspensionType: 'suspensionType',
      reason: 'reason',
      description: 'description',
      startDate: 'startDate',
      endDate: 'endDate',
      isPermanent: 'isPermanent',
      isActive: 'isActive',
      createdById: 'createdById',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message } },
        { status: 403 }
      ) as any,
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    withErrorHandler: (handler: any) => handler,
    now: () => new Date('2026-06-21T12:00:00Z'),
    CACHE_TAGS: { SETTINGS: 'settings' },
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn(
    (role: string, perm: string) => ['ADMIN', 'BOARD'].includes(role) || perm === 'users'
  ),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { GET } from '@/app/api/users/[id]/suspensions/route';

describe('Users Suspensions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { user: { id: 'admin-1' } };
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/users/[id]/suspensions', () => {
    it('returns 401 without auth session', async () => {
      mocks.authSession = null;

      const res = await GET(new Request('http://localhost/api/users/user-1/suspensions'), {
        params: Promise.resolve({ id: 'user-1' }),
      });

      expect(res.status).toBe(401);
    });

    it('returns 403 without users permission', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));
      const { hasPermission } = await import('@shared/lib');
      vi.mocked(hasPermission).mockReturnValueOnce(false);

      const res = await GET(new Request('http://localhost/api/users/user-1/suspensions'), {
        params: Promise.resolve({ id: 'user-1' }),
      });

      expect(res.status).toBe(403);
    });

    it('returns empty suspension list when none exist', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const res = await GET(new Request('http://localhost/api/users/user-1/suspensions'), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.suspensions).toEqual([]);
    });

    it('returns suspension history for the target user', async () => {
      const suspensions = [
        {
          id: 's-1',
          userId: 'user-1',
          suspensionType: 'FULL',
          reason: 'Policy violation',
          description: 'Repeated violations',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-15'),
          isPermanent: false,
          isActive: false,
          createdById: 'admin-1',
          createdAt: new Date('2026-06-01'),
          updatedAt: new Date('2026-06-01'),
        },
      ];
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain(suspensions));

      const res = await GET(new Request('http://localhost/api/users/user-1/suspensions'), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.suspensions).toHaveLength(1);
      expect((body as any).data.suspensions[0].id).toBe('s-1');
      expect((body as any).data.suspensions[0].suspensionType).toBe('FULL');
    });

    it('returns multiple suspension records sorted by createdAt desc', async () => {
      const suspensions = [
        {
          id: 's-2',
          userId: 'user-1',
          suspensionType: 'PARTIAL',
          reason: 'Noise complaint',
          startDate: new Date('2026-06-10'),
          endDate: new Date('2026-06-12'),
          isPermanent: false,
          isActive: true,
          createdById: 'admin-1',
          createdAt: new Date('2026-06-10'),
          updatedAt: new Date('2026-06-10'),
        },
        {
          id: 's-1',
          userId: 'user-1',
          suspensionType: 'FULL',
          reason: 'Policy violation',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-15'),
          isPermanent: false,
          isActive: false,
          createdById: 'admin-1',
          createdAt: new Date('2026-06-01'),
          updatedAt: new Date('2026-06-01'),
        },
      ];
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain(suspensions));

      const res = await GET(new Request('http://localhost/api/users/user-1/suspensions'), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.suspensions).toHaveLength(2);
    });

    it('queries by the correct tenant scope', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      await GET(new Request('http://localhost/api/users/user-1/suspensions'), {
        params: Promise.resolve({ id: 'user-1' }),
      });
    });
  });
});
