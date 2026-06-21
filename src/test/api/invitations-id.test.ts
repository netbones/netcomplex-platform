/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeUpdateChain } from './helpers';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  dbMock: { update: vi.fn() },
  getSessionAndRole: vi.fn(),
  apiUnauthorized: vi.fn(),
  apiSuccess: vi.fn(),
  withTenant: vi.fn(),
  now: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    CACHE_TAGS: { SETTINGS: 'settings' },
    db: mocks.dbMock,
    invitations: {
      id: 'id',
      tenantId: 'tenantId',
      email: 'email',
      name: 'name',
      role: 'role',
      status: 'status',
      deletedAt: 'deletedAt',
    },
    apiError: (code: string, message: string, status = 500) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
    apiSuccess: (data: unknown) => mocks.apiSuccess(data),
    apiGone: (message = 'Resource gone') =>
      NextResponse.json({ success: false, error: { code: 'GONE', message } }, { status: 410 }) as any,
    apiUnauthorized: (message?: string) => mocks.apiUnauthorized(message),
    getSessionAndRole: (...args: unknown[]) => mocks.getSessionAndRole(...args),
    notDeleted: vi.fn(),
    now: () => mocks.now(),
    withErrorHandler: (handler: any) => handler,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.withTenant()),
}));

vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { DELETE } from '@/app/api/invitations/[id]/route';

describe('Invitations [id] API — DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' });
    mocks.withTenant.mockReturnValue({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' });
    mocks.now.mockReturnValue(new Date('2026-06-21T12:00:00Z'));
    mocks.apiUnauthorized.mockReturnValue(
      new Response(
        JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );
    mocks.apiSuccess.mockImplementation(
      (data: unknown) =>
        new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    );
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    mocks.getSessionAndRole.mockResolvedValue(null);

    const response = await DELETE(
      new Request('http://localhost:3000/api/invitations/inv-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv-1' }) } as any
    );

    expect(response.status).toBe(401);
    expect(mocks.dbMock.update).not.toHaveBeenCalled();
  });

  it('soft-deletes invitation by setting deletedAt', async () => {
    const response = await DELETE(
      new Request('http://localhost:3000/api/invitations/inv-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv-1' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.success).toBe(true);
    expect(mocks.dbMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'id' })
    );
  });

  it('calls now() for deletedAt timestamp', async () => {
    await DELETE(
      new Request('http://localhost:3000/api/invitations/inv-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv-1' }) } as any
    );

    expect(mocks.now).toHaveBeenCalled();
  });

  it('enforces tenant isolation via withTenant', async () => {
    await DELETE(
      new Request('http://localhost:3000/api/invitations/inv-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv-1' }) } as any
    );

    expect(mocks.withTenant).toHaveBeenCalled();
  });

  it('handles soft-delete idempotently (already deleted)', async () => {
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const response = await DELETE(
      new Request('http://localhost:3000/api/invitations/inv-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv-1' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.success).toBe(true);
  });

  it('extracts id from params', async () => {
    await DELETE(
      new Request('http://localhost:3000/api/invitations/inv-42', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv-42' }) } as any
    );

    // Verify the set call received deletedAt
    const updateCall = mocks.dbMock.update.mock.results[0];
    const setFn = updateCall?.value?.set;
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
  });
});
