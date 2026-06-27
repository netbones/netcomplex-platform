/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  getRLSContext: vi.fn(),
  runWithRLS: vi.fn(),
  now: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    requireAnyPermission: (perms: string[]) => mocks.requireAnyPermission(perms),
    getRLSContext: (request: any) => mocks.getRLSContext(request),
    runWithRLS: (ctx: any, fn: any) => mocks.runWithRLS(ctx, fn),
    now: () => mocks.now(),
    maintenanceRequests: { id: 'id', tenantId: 'tenantId', status: 'status' },
    groupMembershipRequests: { id: 'id', tenantId: 'tenantId', status: 'status' },
    surveys: { id: 'id', tenantId: 'tenantId', status: 'status' },
    announcements: { id: 'id', tenantId: 'tenantId', expiresAt: 'expiresAt' },
    contents: { id: 'id', tenantId: 'tenantId', published: 'published' },
    competitions: { id: 'id', tenantId: 'tenantId', status: 'status' },
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  };
});

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { GET } from '@/app/api/admin/urgency/route';

const DEFAULT_RLS_CTX = {
  userId: 'user-1',
  tenantId: 'test-tenant-id',
  role: 'ADMIN',
  isPlatformAdmin: false,
};

describe('GET /api/admin/urgency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAnyPermission.mockResolvedValue(null);
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX });
    mocks.now.mockReturnValue(new Date('2026-06-21T12:00:00Z'));

    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => {
      const tx = { select: vi.fn() };
      tx.select
        .mockReturnValueOnce(makeSelectChain([{ count: 5 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 3 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 2 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 1 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 4 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]));
      return fn(tx);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 403 when permission check fails', async () => {
    mocks.requireAnyPermission.mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const res = await GET(new Request('http://localhost/api/admin/urgency'));
    expect(res.status).toBe(403);
  });

  it('returns 401 without RLS context', async () => {
    mocks.getRLSContext.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/admin/urgency'));
    expect(res.status).toBe(401);
  });

  it('returns urgency counts', async () => {
    const res = await GET(new Request('http://localhost/api/admin/urgency'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.commandBar).toEqual({
      openMaintenance: 5,
      pendingMembers: 3,
      closingSurveys: 2,
      expiredAnnouncements: 1,
    });
    expect(body.data.domainBadges).toEqual({
      users: 3,
      maintenance: 5,
      content: 4,
      events: 0,
      competitions: 0,
      resources: 0,
      surveys: 2,
      announcements: 1,
      system: 0,
    });
  });

  it('returns zero counts when no data', async () => {
    mocks.runWithRLS.mockImplementation(async (_ctx, fn) => {
      const tx = { select: vi.fn() };
      tx.select
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]));
      return fn(tx);
    });

    const res = await GET(new Request('http://localhost/api/admin/urgency'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.commandBar.openMaintenance).toBe(0);
    expect(body.data.domainBadges.maintenance).toBe(0);
  });

  it('handles database error', async () => {
    mocks.runWithRLS.mockImplementation(() => {
      throw new Error('DB error');
    });

    const res = await GET(new Request('http://localhost/api/admin/urgency'));
    expect(res.status).toBe(500);
  });
});
