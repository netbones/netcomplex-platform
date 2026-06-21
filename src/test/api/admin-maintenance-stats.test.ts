/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from './helpers';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getRLSContext: vi.fn(),
  runWithRLS: vi.fn(),
  now: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getRLSContext: (request: any) => mocks.getRLSContext(request),
    runWithRLS: (ctx: any, fn: any) => mocks.runWithRLS(ctx, fn),
    now: () => mocks.now(),
    maintenanceRequests: {
      id: 'id',
      tenantId: 'tenantId',
      userId: 'userId',
      status: 'status',
      category: 'category',
      priority: 'priority',
      description: 'description',
      ticketNumber: 'ticketNumber',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      completedAt: 'completedAt',
      scheduledDate: 'scheduledDate',
    },
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message } },
        { status: 403 }
      ) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    withErrorHandler:
      (fn: any) =>
      (...args: any[]) =>
        fn(...args),
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  };
});

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { GET } from '@/app/api/admin/maintenance-stats/route';

const DEFAULT_RLS_CTX = {
  userId: 'user-1',
  tenantId: 'test-tenant-id',
  role: 'ADMIN',
  isPlatformAdmin: false,
};

describe('GET /api/admin/maintenance-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX });
    mocks.now.mockReturnValue(new Date('2026-06-21T12:00:00Z'));

    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => {
      const tx = { select: vi.fn() };
      tx.select
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));
      return fn(tx);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without RLS context', async () => {
    mocks.getRLSContext.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/admin/maintenance-stats'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-board/admin role', async () => {
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX, role: 'RESIDENT' });
    const res = await GET(new Request('http://localhost/api/admin/maintenance-stats'));
    expect(res.status).toBe(403);
  });

  it('returns maintenance stats overview with counts', async () => {
    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => {
      const tx = { select: vi.fn() };
      tx.select
        .mockReturnValueOnce(makeSelectChain([{ count: 10 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 5 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 3 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 2 }]))
        .mockReturnValueOnce(
          makeSelectChain([
            { status: 'SUBMITTED', count: 3 },
            { status: 'IN_PROGRESS', count: 7 },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            { priority: 'HIGH', count: 5 },
            { priority: 'LOW', count: 5 },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            { category: 'plumbing', count: 4 },
            { category: 'electrical', count: 6 },
          ])
        )
        .mockReturnValueOnce(makeSelectChain([{ avgDays: 3.5 }]))
        .mockReturnValueOnce(
          makeSelectChain([
            { month: '2026-01', count: 10 },
            { month: '2026-02', count: 8 },
          ])
        );
      return fn(tx);
    });

    const res = await GET(new Request('http://localhost/api/admin/maintenance-stats'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.overview).toEqual({
      totalOpen: 10,
      submittedThisMonth: 5,
      completedThisMonth: 3,
      overdue: 2,
      avgResolutionDays: 3.5,
    });
    expect(body.data.byStatus).toHaveLength(2);
    expect(body.data.byPriority).toHaveLength(2);
    expect(body.data.byCategory).toHaveLength(2);
  });

  it('returns trend data', async () => {
    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => {
      const tx = { select: vi.fn() };
      tx.select
        .mockReturnValueOnce(makeSelectChain([{ count: 10 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 5 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 3 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 2 }]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(
          makeSelectChain([
            { month: '2026-01', count: 10 },
            { month: '2026-02', count: 8 },
            { month: '2026-03', count: 12 },
          ])
        );
      return fn(tx);
    });

    const res = await GET(new Request('http://localhost/api/admin/maintenance-stats'));
    const body = await res.json();

    expect(body.data.trend).toHaveLength(3);
    expect(body.data.trend[0]).toEqual({ month: '2026-01', count: 10 });
  });

  it('returns empty/zero data when no results', async () => {
    const res = await GET(new Request('http://localhost/api/admin/maintenance-stats'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.overview).toEqual({
      totalOpen: 0,
      submittedThisMonth: 0,
      completedThisMonth: 0,
      overdue: 0,
      avgResolutionDays: 0,
    });
    expect(body.data.byStatus).toEqual([]);
    expect(body.data.byPriority).toEqual([]);
    expect(body.data.byCategory).toEqual([]);
    expect(body.data.trend).toEqual([]);
  });
});
