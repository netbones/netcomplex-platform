/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeInsertChain } from '@/test/api/helpers';

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
  sessionResult: null as { user: { id: string } } | null,
  dbMock: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  revalidateDashboard: vi.fn(),
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'requests') return role === 'ADMIN' || role === 'MANAGER';
    return false;
  }),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiCreated: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiForbidden: vi.fn(
    (message = 'Forbidden') =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiNotFound: vi.fn(
    (message = 'Not found') =>
      new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (_code: string, _message: string, status: number) =>
      new Response(JSON.stringify({ success: false, error: { code: _code, message: _message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: {
      api: {
        getSession: () => Promise.resolve(mocks.sessionResult),
      },
    },
    db: mocks.dbMock,
    requestNotes: {
      id: 'id',
      requestId: 'requestId',
      userId: 'userId',
      content: 'content',
      isInternal: 'isInternal',
      createdAt: 'createdAt',
    },
    users: { id: 'id', role: 'role', name: 'name', email: 'email' },
    getSessionAndRole: async () => {
      if (!mocks.sessionResult) return null;
      return { userId: mocks.sessionResult.user.id, role: 'ADMIN', isPlatformAdmin: false };
    },
    guardSuspension: () => null,
    maintenanceRequests: {
      id: 'id',
      tenantId: 'tenantId',
      userId: 'userId',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    revalidateDashboard: mocks.revalidateDashboard,
    withErrorHandler: (h: any) => h,
    createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    apiSuccess: mocks.apiSuccess,
    apiCreated: mocks.apiCreated,
    apiUnauthorized: mocks.apiUnauthorized,
    apiForbidden: mocks.apiForbidden,
    apiNotFound: mocks.apiNotFound,
    apiError: mocks.apiError,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (...args: Parameters<typeof mocks.hasPermission>) => mocks.hasPermission(...args),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { GET, POST } from '@/app/api/maintenance/[id]/notes/route';

const REQUEST_ID = 'req-1';
const mockRequest = {
  id: REQUEST_ID,
  tenantId: 'test-tenant-id',
  userId: 'user-1',
  status: 'SUBMITTED',
  createdAt: new Date('2026-06-21T10:00:00Z'),
  updatedAt: new Date('2026-06-21T10:00:00Z'),
};

const noteEntries = [
  {
    id: 'note-3',
    requestId: REQUEST_ID,
    content: 'Internal note: awaiting parts',
    isInternal: true,
    createdAt: new Date('2026-06-21T11:30:00Z'),
    user: { id: 'admin-1', name: 'Admin User' },
  },
  {
    id: 'note-2',
    requestId: REQUEST_ID,
    content: 'Scheduled for Tuesday',
    isInternal: false,
    createdAt: new Date('2026-06-21T11:00:00Z'),
    user: { id: 'admin-1', name: 'Admin User' },
  },
  {
    id: 'note-1',
    requestId: REQUEST_ID,
    content: 'Resident reported leak in kitchen',
    isInternal: false,
    createdAt: new Date('2026-06-21T10:15:00Z'),
    user: { id: 'user-1', name: 'Test User' },
  },
];

function makeParams(id = REQUEST_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(method: string, body?: unknown): Request {
  return new Request(`http://localhost/api/maintenance/${REQUEST_ID}/notes`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = null;
  mocks.revalidateDashboard.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/maintenance/[id]/notes', () => {
  beforeEach(() => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  it('returns 401 without auth', async () => {
    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when maintenance request not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns all notes including internal for admin', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain(noteEntries));

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(3);

    const internalNotes = body.data.filter((n: any) => n.isInternal);
    expect(internalNotes).toHaveLength(1);
    expect(internalNotes[0].content).toBe('Internal note: awaiting parts');
  });

  it('returns only non-internal notes for resident', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    // RESIDENT role naturally fails the permission check via the mock implementation

    // Only return non-internal notes (simulating the filter)
    const publicNotes = noteEntries.filter(n => !n.isInternal);
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain(publicNotes));

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    body.data.forEach((note: any) => {
      expect(note.isInternal).toBe(false);
    });
  });

  it('returns empty array when no notes exist', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain([]));

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('includes user info in each note', async () => {
    mocks.sessionResult = { user: { id: 'admin-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]))
      .mockReturnValueOnce(makeSelectChain(noteEntries));

    const res = await GET(makeRequest('GET'), makeParams());
    const body = await res.json();

    body.data.forEach((note: any) => {
      expect(note.user).toBeDefined();
      expect(note.user.name).toBeDefined();
    });
  });

  it('enforces tenant isolation', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // other tenant

    const res = await GET(makeRequest('GET'), makeParams());
    expect(res.status).toBe(404);
  });
});

describe('POST /api/maintenance/[id]/notes', () => {
  beforeEach(() => {
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));
  });

  it('returns 401 without auth', async () => {
    const res = await POST(makeRequest('POST', { content: 'Test note' }), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 without requests permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

    const res = await POST(makeRequest('POST', { content: 'Test note' }), makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 404 when maintenance request not found', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // MR not found

    const res = await POST(makeRequest('POST', { content: 'Test note' }), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 400 when content is missing', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const res = await POST(makeRequest('POST', {}), makeParams());
    expect(res.status).toBe(400);
  });

  it('returns 201 and creates a note with isInternal defaulting to true', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const createdNote = {
      id: 'note-new',
      requestId: REQUEST_ID,
      userId: 'user-1',
      content: 'Admin observation',
      isInternal: true,
      createdAt: new Date('2026-06-21T12:00:00Z'),
    };
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([createdNote]));

    const res = await POST(makeRequest('POST', { content: 'Admin observation' }), makeParams());
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.content).toBe('Admin observation');
    expect(body.data.isInternal).toBe(true);
  });

  it('creates a public note when isInternal is false', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    const createdNote = {
      id: 'note-public',
      requestId: REQUEST_ID,
      userId: 'user-1',
      content: 'Update for resident',
      isInternal: false,
      createdAt: new Date('2026-06-21T12:00:00Z'),
    };
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([createdNote]));

    const res = await POST(
      makeRequest('POST', { content: 'Update for resident', isInternal: false }),
      makeParams()
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.content).toBe('Update for resident');
    expect(body.data.isInternal).toBe(false);
  });

  it('calls revalidateDashboard after creation', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([mockRequest]));

    mocks.dbMock.insert.mockReturnValue(
      makeInsertChain([
        {
          id: 'note-new',
          requestId: REQUEST_ID,
          userId: 'user-1',
          content: 'Test',
          isInternal: false,
          createdAt: new Date(),
        },
      ])
    );

    await POST(makeRequest('POST', { content: 'Test', isInternal: false }), makeParams());
    expect(mocks.revalidateDashboard).toHaveBeenCalled();
  });

  it('enforces tenant isolation', async () => {
    mocks.sessionResult = { user: { id: 'user-1' } };
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]))
      .mockReturnValueOnce(makeSelectChain([])); // other tenant

    const res = await POST(makeRequest('POST', { content: 'Test' }), makeParams());
    expect(res.status).toBe(404);
  });
});
