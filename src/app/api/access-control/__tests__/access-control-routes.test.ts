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
  sessionResult: { user: { id: 'user-1' } } as { user: { id: string } } | null,
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  propertyId: 'prop-1' as string | null,
  resolveCallerPropertyId: vi.fn(),
  listVisitorHistory: vi.fn(),
  listAccessInbox: vi.fn(),
  createQuickAccessCode: vi.fn(),
  getAccessRequestForProperty: vi.fn(),
  respondToAccessRequest: vi.fn(),
  listActiveVisitors: vi.fn(),
  createVisitorWithCode: vi.fn(),
  cancelVisitor: vi.fn(),
}));

const jsonResponse = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

vi.mock('@/shared/api/auth-utils', () => ({
  requireAuth: vi.fn(async () => {
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
        role: 'RESIDENT',
        tenantId: 'test-tenant-id',
        session: { user: { id: mocks.sessionResult.user.id } },
        suspension: null,
      },
    };
  }),
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  accessRequests: {},
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

vi.mock('@entities/access-control/server', () => ({
  resolveCallerPropertyId: (...args: unknown[]) => mocks.resolveCallerPropertyId(...args),
  listVisitorHistory: (...args: unknown[]) => mocks.listVisitorHistory(...args),
  listAccessInbox: (...args: unknown[]) => mocks.listAccessInbox(...args),
  createQuickAccessCode: (...args: unknown[]) => mocks.createQuickAccessCode(...args),
  getAccessRequestForProperty: (...args: unknown[]) => mocks.getAccessRequestForProperty(...args),
  respondToAccessRequest: (...args: unknown[]) => mocks.respondToAccessRequest(...args),
  listActiveVisitors: (...args: unknown[]) => mocks.listActiveVisitors(...args),
  createVisitorWithCode: (...args: unknown[]) => mocks.createVisitorWithCode(...args),
  cancelVisitor: (...args: unknown[]) => mocks.cancelVisitor(...args),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { NextRequest } from 'next/server';
import { GET as historyGet } from '@/app/api/access-control/history/route';
import { GET as inboxGet } from '@/app/api/access-control/inbox/route';
import {
  GET as inboxItemGet,
  POST as inboxItemPost,
} from '@/app/api/access-control/inbox/[id]/route';
import { POST as quickCodePost } from '@/app/api/access-control/quick-code/route';
import { GET as visitorsGet, POST as visitorsPost } from '@/app/api/access-control/visitors/route';
import { DELETE as visitorDelete } from '@/app/api/access-control/visitors/[id]/route';

const getReq = (url = 'http://localhost:3000/api/access-control') =>
  new Request(url, { headers: { 'x-tenant-id': 'test-tenant-id' } });

const postReq = (url: string, body?: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-id': 'test-tenant-id' },
    body: body ? JSON.stringify(body) : undefined,
  });

const ctx = { params: Promise.resolve({ id: 'req-1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = { user: { id: 'user-1' } };
  mocks.propertyId = 'prop-1';
  mocks.resolveCallerPropertyId.mockResolvedValue('prop-1');
});

afterEach(() => {
  mocks.sessionResult = { user: { id: 'user-1' } };
  mocks.propertyId = 'prop-1';
});

describe('GET /api/access-control/history', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.sessionResult = null;
    const res = await historyGet(getReq());
    expect(res.status).toBe(401);
  });

  it('returns 400 when no property is linked', async () => {
    mocks.resolveCallerPropertyId.mockResolvedValue(null);
    const res = await historyGet(getReq());
    expect(res.status).toBe(400);
  });

  it('returns visitors and resolved access requests', async () => {
    mocks.listVisitorHistory.mockResolvedValue([{ id: 'v-1', status: 'EXPIRED' }]);
    mocks.dbMock.select.mockReturnValueOnce(
      (() => {
        const chain: Record<string, unknown> = {
          from: vi.fn(() => chain),
          innerJoin: vi.fn(() => chain),
          leftJoin: vi.fn(() => chain),
          where: vi.fn(() => chain),
          orderBy: vi.fn(() => chain),
          limit: vi.fn(() => Promise.resolve([])),
        };
        return chain;
      })()
    );

    const res = await historyGet(getReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.visitors).toHaveLength(1);
    expect(body.data.accessRequests).toEqual([]);
  });
});

describe('GET /api/access-control/inbox', () => {
  it('returns 400 when no property is linked', async () => {
    mocks.resolveCallerPropertyId.mockResolvedValue(null);
    const res = await inboxGet(getReq());
    expect(res.status).toBe(400);
  });

  it('returns the pending inbox', async () => {
    mocks.listAccessInbox.mockResolvedValue({ pending: [{ id: 'r-1' }], pendingCount: 1 });
    const res = await inboxGet(getReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.pendingCount).toBe(1);
  });
});

describe('GET /api/access-control/inbox/[id]', () => {
  it('returns 404 when the request is missing', async () => {
    mocks.getAccessRequestForProperty.mockResolvedValue(null);
    const res = await inboxItemGet(
      getReq('http://localhost:3000/api/access-control/inbox/req-1'),
      ctx
    );
    expect(res.status).toBe(404);
  });

  it('returns the access request', async () => {
    mocks.getAccessRequestForProperty.mockResolvedValue({ id: 'req-1', status: 'PENDING' });
    const res = await inboxItemGet(
      getReq('http://localhost:3000/api/access-control/inbox/req-1'),
      ctx
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.request.id).toBe('req-1');
  });
});

describe('POST /api/access-control/inbox/[id]', () => {
  it('returns 400 for an invalid action', async () => {
    const res = await inboxItemPost(
      postReq('http://localhost:3000/api/access-control/inbox/req-1', { action: 'ban' }),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when the request is not found', async () => {
    mocks.respondToAccessRequest.mockResolvedValue({ ok: false, reason: 'NOT_FOUND' });
    const res = await inboxItemPost(
      postReq('http://localhost:3000/api/access-control/inbox/req-1', { action: 'allow' }),
      ctx
    );
    expect(res.status).toBe(404);
  });

  it('returns 409 when the request is already resolved', async () => {
    mocks.respondToAccessRequest.mockResolvedValue({ ok: false, reason: 'ALREADY_RESOLVED' });
    const res = await inboxItemPost(
      postReq('http://localhost:3000/api/access-control/inbox/req-1', { action: 'deny' }),
      ctx
    );
    expect(res.status).toBe(409);
  });

  it('responds successfully', async () => {
    mocks.respondToAccessRequest.mockResolvedValue({ ok: true });
    const res = await inboxItemPost(
      postReq('http://localhost:3000/api/access-control/inbox/req-1', { action: 'allow' }),
      ctx
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.action).toBe('allow');
  });
});

describe('POST /api/access-control/quick-code', () => {
  it('returns 400 for an empty name', async () => {
    const res = await quickCodePost(
      postReq('http://localhost:3000/api/access-control/quick-code', { fullName: ' ' })
    );
    expect(res.status).toBe(400);
  });

  it('creates a quick access code', async () => {
    mocks.createQuickAccessCode.mockResolvedValue({ visitor: { fullName: 'Sam' }, accessCode: {} });
    const res = await quickCodePost(
      postReq('http://localhost:3000/api/access-control/quick-code', { fullName: 'Sam' })
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.visitor.fullName).toBe('Sam');
    expect(mocks.createQuickAccessCode).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Sam' })
    );
  });
});

describe('GET /api/access-control/visitors', () => {
  it('returns active visitors', async () => {
    mocks.listActiveVisitors.mockResolvedValue([{ id: 'v-1', fullName: 'Jane' }]);
    const res = await visitorsGet(
      new NextRequest('http://localhost:3000/api/access-control/visitors', {
        headers: { 'x-tenant-id': 'test-tenant-id' },
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.visitors).toHaveLength(1);
  });
});

describe('POST /api/access-control/visitors', () => {
  it('returns 400 for an invalid visitor payload', async () => {
    const res = await visitorsPost(
      postReq('http://localhost:3000/api/access-control/visitors', {
        fullName: '',
        visitorType: 'WALK_IN',
      })
    );
    expect(res.status).toBe(400);
  });

  it('creates a visitor with code', async () => {
    mocks.createVisitorWithCode.mockResolvedValue({
      visitor: { fullName: 'Jane' },
      accessCode: {},
    });
    const res = await visitorsPost(
      postReq('http://localhost:3000/api/access-control/visitors', {
        fullName: 'Jane',
        visitorType: 'WALK_IN',
        validFrom: '2026-01-01T10:00:00.000Z',
      })
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.visitor.fullName).toBe('Jane');
  });
});

describe('DELETE /api/access-control/visitors/[id]', () => {
  it('returns 404 when the visitor is not found', async () => {
    mocks.cancelVisitor.mockResolvedValue(false);
    const res = await visitorDelete(
      getReq('http://localhost:3000/api/access-control/visitors/v-1'),
      ctx
    );
    expect(res.status).toBe(404);
  });

  it('cancels the visitor', async () => {
    mocks.cancelVisitor.mockResolvedValue(true);
    const res = await visitorDelete(
      getReq('http://localhost:3000/api/access-control/visitors/v-1'),
      ctx
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.cancelled).toBe(true);
  });
});
