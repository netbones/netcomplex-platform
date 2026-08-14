import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  sessionResult: { user: { id: 'admin-1' } } as { user: { id: string } } | null,
  dbMock: {
    select: vi.fn(),
    update: vi.fn(),
  },
  now: vi.fn(() => new Date('2026-08-01T12:00:00.000Z')),
}));

const jsonResponse = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

vi.mock('@/shared/api/auth-utils', () => ({
  requireAuth: vi.fn(async (_req: Request, _opts?: { permission?: string }) => {
    if (!mocks.sessionResult) {
      return {
        success: false as const,
        response: jsonResponse(
          { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
          401
        ),
      };
    }
    return {
      success: true as const,
      data: {
        userId: mocks.sessionResult.user.id,
        role: 'ADMIN',
        tenantId: 'test-tenant-id',
        session: { user: { id: mocks.sessionResult.user.id } },
        suspension: null,
      },
    };
  }),
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  now: mocks.now,
  securityAlerts: {},
  withErrorHandler: vi.fn(<T>(handler: T) => handler),
  apiSuccess: vi.fn((data: unknown, _meta?: unknown, status = 200) =>
    jsonResponse({ success: true, data }, status)
  ),
  apiError: vi.fn((code: string, message: string, status: number, details?: unknown) =>
    jsonResponse(
      {
        success: false,
        error: { code, message, ...(details !== undefined ? { details } : {}) },
      },
      status
    )
  ),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id' }),
  assertModuleEnabled: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { makeSelectChain, makeUpdateChain } from '@/test/api/helpers';
import { PATCH } from '@/app/api/admin/security/alerts/[id]/route';

const ctx = { params: Promise.resolve({ id: 'alert-1' }) };

const patchReq = (action: string) =>
  new Request('http://localhost:3000/api/admin/security/alerts/alert-1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-tenant-id': 'test-tenant-id' },
    body: JSON.stringify({ action }),
  });

function alertRow(status: string) {
  return {
    id: 'alert-1',
    tenantId: 'test-tenant-id',
    propertyId: null,
    triggeredByUserId: 'user-1',
    alertType: 'PANIC',
    latitude: null,
    longitude: null,
    locationAccuracyM: null,
    withinBoundary: null,
    message: null,
    status,
    createdAt: new Date('2026-08-01T11:00:00.000Z'),
    acknowledgedAt: null,
    acknowledgedByUserId: null,
    resolvedAt: null,
    resolvedByUserId: null,
    updatedAt: new Date('2026-08-01T11:00:00.000Z'),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = { user: { id: 'admin-1' } };
  mocks.dbMock.select.mockReturnValue(makeSelectChain([alertRow('SENT')]));
  mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
});

describe('PATCH /api/admin/security/alerts/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.sessionResult = null;
    const res = await PATCH(patchReq('acknowledge'), ctx);
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid action', async () => {
    const res = await PATCH(patchReq('dismiss'), ctx);
    expect(res.status).toBe(400);
  });

  it('returns 404 when the alert is not found', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));
    const res = await PATCH(patchReq('acknowledge'), ctx);
    expect(res.status).toBe(404);
  });

  it('acknowledges a SENT alert', async () => {
    const res = await PATCH(patchReq('acknowledge'), ctx);
    expect(res.status).toBe(200);
    expect(mocks.dbMock.update).toHaveBeenCalledOnce();
  });

  it('rejects acknowledging an alert that is not SENT/FAILED', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([alertRow('RESOLVED')]));
    const res = await PATCH(patchReq('acknowledge'), ctx);
    expect(res.status).toBe(409);
    expect(mocks.dbMock.update).not.toHaveBeenCalled();
  });

  it('marks an ACKNOWLEDGED alert as responding', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([alertRow('ACKNOWLEDGED')]));
    const res = await PATCH(patchReq('responding'), ctx);
    expect(res.status).toBe(200);
    expect(mocks.dbMock.update).toHaveBeenCalledOnce();
  });

  it('rejects responding unless the alert is ACKNOWLEDGED', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([alertRow('SENT')]));
    const res = await PATCH(patchReq('responding'), ctx);
    expect(res.status).toBe(409);
  });

  it('resolves an ACKNOWLEDGED alert', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([alertRow('ACKNOWLEDGED')]));
    const res = await PATCH(patchReq('resolve'), ctx);
    expect(res.status).toBe(200);
    expect(mocks.dbMock.update).toHaveBeenCalledOnce();
  });

  it('rejects resolving an alert already RESOLVED', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([alertRow('RESOLVED')]));
    const res = await PATCH(patchReq('resolve'), ctx);
    expect(res.status).toBe(409);
  });

  it('allows resolving a RESPONDING alert', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([alertRow('RESPONDING')]));
    const res = await PATCH(patchReq('resolve'), ctx);
    expect(res.status).toBe(200);
  });

  it('rejects FAILED alerts from being resolved', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([alertRow('FAILED')]));
    const res = await PATCH(patchReq('resolve'), ctx);
    expect(res.status).toBe(409);
  });
});
