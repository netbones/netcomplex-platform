/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from './helpers';

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
  getSession: vi.fn(),
  dbMock: { select: vi.fn(), delete: vi.fn() },
  hasPermission: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: { api: { getSession: mocks.getSession } },
    db: mocks.dbMock,
    users: { id: 'id', role: 'role' },
    messages: { id: 'id', deletedAt: 'deletedAt' },
    apiSuccess: (data: unknown) =>
      NextResponse.json({ success: true, data }, { status: 200 }) as any,
    apiUnauthorized: (_message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      ) as any,
    apiForbidden: (_message = 'Forbidden') =>
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        { status: 403 }
      ) as any,
    apiInternalError: (_message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      ) as any,
  };
});

vi.mock('@shared/lib', () => ({
  hasPermission: mocks.hasPermission,
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { GET } from '@/app/api/purge/route';

describe('GET /api/purge', () => {
  function makeDeleteChain(result: unknown[]) {
    return {
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(result)),
      })),
    };
  }

  function makeFailingDeleteChain() {
    return {
      where: vi.fn(() => {
        throw new Error('DB error');
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when no session exists', async () => {
    mocks.getSession.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/purge') as any);

    expect(res.status).toBe(401);
  });

  it('returns 401 when session has no user id', async () => {
    mocks.getSession.mockResolvedValue({ user: {} });

    const res = await GET(new Request('http://localhost/api/purge') as any);

    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks admin permission', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));
    mocks.hasPermission.mockReturnValue(false);

    const res = await GET(new Request('http://localhost/api/purge') as any);

    expect(res.status).toBe(403);
  });

  it('purges messages older than 90 days and returns count', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.hasPermission.mockReturnValue(true);
    mocks.dbMock.delete.mockReturnValue(
      makeDeleteChain([{ id: 'msg-1' }, { id: 'msg-2' }, { id: 'msg-3' }])
    );

    const res = await GET(new Request('http://localhost/api/purge') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data).toEqual({ purged: { messages: 3 } });
  });

  it('returns 0 count when no messages to purge', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.hasPermission.mockReturnValue(true);
    mocks.dbMock.delete.mockReturnValue(makeDeleteChain([]));

    const res = await GET(new Request('http://localhost/api/purge') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data).toEqual({ purged: { messages: 0 } });
  });

  it('returns 500 when database operation fails', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
    mocks.hasPermission.mockReturnValue(true);
    mocks.dbMock.delete.mockReturnValue(makeFailingDeleteChain());

    const res = await GET(new Request('http://localhost/api/purge') as any);

    expect(res.status).toBe(500);
  });
});
