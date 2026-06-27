/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeInsertChain, makeDeleteChain } from './helpers';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionAndRole: vi.fn(),
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    db: mocks.dbMock,
    groupMembers: {
      id: 'id',
      tenantId: 'tenantId',
      userId: 'userId',
      groupId: 'groupId',
      role: 'role',
      joinedAt: 'joinedAt',
    },
    getSessionAndRole: (...args: unknown[]) => mocks.getSessionAndRole(...args),
    now: () => new Date(),
    withErrorHandler: (handler: any) => handler,
    apiSuccess: (data: unknown, _meta?: unknown, status = 200) =>
      NextResponse.json({ success: true, data }, { status }) as any,
    apiCreated: (data: unknown) =>
      NextResponse.json({ success: true, data }, { status: 201 }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiError: (code: string, message: string, status = 500) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({}));

import { POST, DELETE } from '@/app/api/groups/members/route';

describe('Groups Members API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' });
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([{ id: 'mem-1' }]));
    mocks.dbMock.delete.mockReturnValue(makeDeleteChain());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/groups/members', () => {
    function postRequest(body: unknown): Request {
      return new Request('http://localhost/api/groups/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    it('returns 401 without a session', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const res = await POST(postRequest({ userId: 'u1', groupId: 'g1' }));

      expect(res.status).toBe(401);
    });

    it('returns 400 when membership already exists', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ id: 'existing-mem' }]));

      const res = await POST(postRequest({ userId: 'u1', groupId: 'g1' }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
    });

    it('creates membership with default role (MEMBER)', async () => {
      mocks.dbMock.insert.mockReturnValue(
        makeInsertChain([{ id: 'mem-1', userId: 'u1', groupId: 'g1', role: 'MEMBER' }])
      );

      const res = await POST(postRequest({ userId: 'u1', groupId: 'g1' }));
      const body = await res.json();

      expect(res.status).toBe(201);
      expect((body as any).data.id).toBe('mem-1');
      expect((body as any).data.role).toBe('MEMBER');
    });

    it('creates membership with custom role', async () => {
      mocks.dbMock.insert.mockReturnValue(
        makeInsertChain([{ id: 'mem-2', userId: 'u1', groupId: 'g1', role: 'MODERATOR' }])
      );

      const res = await POST(postRequest({ userId: 'u1', groupId: 'g1', role: 'MODERATOR' }));
      const body = await res.json();

      expect(res.status).toBe(201);
      expect((body as any).data.role).toBe('MODERATOR');
    });

    it('checks for existing membership before inserting', async () => {
      const existing = [{ id: 'existing' }];
      mocks.dbMock.select.mockReturnValue(makeSelectChain(existing));

      const res = await POST(postRequest({ userId: 'u1', groupId: 'g1' }));

      expect(res.status).toBe(400);
      expect(mocks.dbMock.insert).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/groups/members', () => {
    function deleteRequest(url: string): Request {
      return new Request(url, { method: 'DELETE' });
    }

    it('returns 401 without a session', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const res = await DELETE(
        deleteRequest('http://localhost/api/groups/members?userId=u1&groupId=g1')
      );

      expect(res.status).toBe(401);
    });

    it('returns 400 when userId is missing', async () => {
      const res = await DELETE(deleteRequest('http://localhost/api/groups/members?groupId=g1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when groupId is missing', async () => {
      const res = await DELETE(deleteRequest('http://localhost/api/groups/members?userId=u1'));

      expect(res.status).toBe(400);
    });

    it('returns 400 when both query params are missing', async () => {
      const res = await DELETE(deleteRequest('http://localhost/api/groups/members'));

      expect(res.status).toBe(400);
    });

    it('deletes membership with tenant isolation', async () => {
      const res = await DELETE(
        deleteRequest('http://localhost/api/groups/members?userId=u1&groupId=g1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data).toEqual({ success: true });
      expect(mocks.dbMock.delete).toHaveBeenCalledTimes(1);
    });
  });
});
