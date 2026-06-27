/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  eventAttendees: {
    id: 'id',
    eventId: 'eventId',
    userId: 'userId',
    tenantId: 'tenantId',
    createdAt: 'createdAt',
  },
  users: {
    id: 'id',
    name: 'name',
    role: 'role',
    avatar: 'avatar',
  },
  withErrorHandler: (handler: any) => handler,
  apiSuccess: vi.fn((data: unknown) => Response.json({ success: true, data }, { status: 200 })),
  apiError: vi.fn((code: string, message: string, status: number) =>
    Response.json({ success: false, error: { code, message } }, { status })
  ),
  apiUnauthorized: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'AUTH_REQUIRED', message: message || 'Authentication required' },
      },
      { status: 401 }
    )
  ),
  apiNotFound: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: message || 'Not found' } },
      { status: 404 }
    )
  ),
  apiConflict: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'CONFLICT', message: message || 'Conflict' } },
      { status: 409 }
    )
  ),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

import { GET, POST, DELETE } from '@/app/api/events/[id]/register/route';

const EVENT_ID = 'event-1';
const USER_ID = 'user-1';

function makeRequest(method: string, body?: unknown): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(`http://localhost/api/events/${EVENT_ID}/register`, init);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/events/[id]/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const res = await GET(makeRequest('GET'), makeParams(EVENT_ID));
    expect(res.status).toBe(401);
  });

  it('returns attendee list with registered=true when user is attending', async () => {
    mocks.sessionResult = { user: { id: USER_ID } };

    const attendeeChain = makeSelectChain([
      {
        id: 'a-1',
        userId: USER_ID,
        name: 'Alice',
        avatar: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'a-2',
        userId: 'user-2',
        name: 'Bob',
        avatar: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    mocks.dbMock.select.mockReturnValue(attendeeChain);

    const res = await GET(makeRequest('GET'), makeParams(EVENT_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.attendees).toHaveLength(2);
    expect(body.data.registered).toBe(true);
  });

  it('returns attendee list with registered=false when user is not attending', async () => {
    mocks.sessionResult = { user: { id: USER_ID } };

    const attendeeChain = makeSelectChain([
      {
        id: 'a-3',
        userId: 'user-2',
        name: 'Bob',
        avatar: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    mocks.dbMock.select.mockReturnValue(attendeeChain);

    const res = await GET(makeRequest('GET'), makeParams(EVENT_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.attendees).toHaveLength(1);
    expect(body.data.registered).toBe(false);
  });

  it('returns empty attendee list', async () => {
    mocks.sessionResult = { user: { id: USER_ID } };

    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const res = await GET(makeRequest('GET'), makeParams(EVENT_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.attendees).toEqual([]);
    expect(body.data.registered).toBe(false);
  });
});

describe('POST /api/events/[id]/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const res = await POST(makeRequest('POST'), makeParams(EVENT_ID));
    expect(res.status).toBe(401);
  });

  it('returns 409 when already registered', async () => {
    mocks.sessionResult = { user: { id: USER_ID } };

    const existingChain = makeSelectChain([{ id: 'a-1' }]);
    mocks.dbMock.select.mockReturnValue(existingChain);

    const res = await POST(makeRequest('POST'), makeParams(EVENT_ID));
    expect(res.status).toBe(409);
  });

  it('registers user and returns success', async () => {
    mocks.sessionResult = { user: { id: USER_ID } };

    // First select (existing check) → no existing registration
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

    // Insert → returning the new attendee
    const newAttendee = {
      id: 'a-new',
      eventId: EVENT_ID,
      userId: USER_ID,
      tenantId: 'test-tenant-id',
    };
    mocks.dbMock.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newAttendee]),
      }),
    });

    const res = await POST(makeRequest('POST'), makeParams(EVENT_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('a-new');
    expect(body.data.eventId).toBe(EVENT_ID);
  });
});

describe('DELETE /api/events/[id]/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const res = await DELETE(makeRequest('DELETE'), makeParams(EVENT_ID));
    expect(res.status).toBe(401);
  });

  it('returns 404 when not registered', async () => {
    mocks.sessionResult = { user: { id: USER_ID } };

    mocks.dbMock.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });

    const res = await DELETE(makeRequest('DELETE'), makeParams(EVENT_ID));
    expect(res.status).toBe(404);
  });

  it('unregisters user and returns success', async () => {
    mocks.sessionResult = { user: { id: USER_ID } };

    mocks.dbMock.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'a-1' }]),
      }),
    });

    const res = await DELETE(makeRequest('DELETE'), makeParams(EVENT_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.success).toBe(true);
  });
});
