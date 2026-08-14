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
  dispatchPanicAlert: vi.fn(),
  now: vi.fn(() => new Date('2026-08-01T12:00:00.000Z')),
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
  now: mocks.now,
  securityAlerts: {},
  securityContacts: {},
  standardSeats: {},
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
  apiInternalError: vi.fn((message: string) =>
    jsonResponse({ success: false, error: { message } }, 500)
  ),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id' }),
  assertModuleEnabled: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@entities/security/server', () => ({
  dispatchPanicAlert: (...args: unknown[]) => mocks.dispatchPanicAlert(...args),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@shared/lib/id', () => ({
  createId: vi.fn(() => 'alert-1'),
}));

import { makeSelectChain, makeInsertChain, makeUpdateChain } from '@/test/api/helpers';
import { POST as panicPost } from '@/app/api/security/panic/route';
import { GET as alertsGet } from '@/app/api/security/alerts/route';
import { POST as tipsPost } from '@/app/api/security/tips/route';
import { GET as contactsGet } from '@/app/api/security/contacts/route';

const makeRequest = (body?: unknown) =>
  new Request('http://localhost:3000/api/security/panic', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-id': 'test-tenant-id' },
    body: body ? JSON.stringify(body) : undefined,
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionResult = { user: { id: 'user-1' } };
  mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));
  mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
});

afterEach(() => {
  mocks.sessionResult = { user: { id: 'user-1' } };
});

describe('POST /api/security/panic', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.sessionResult = null;
    const res = await panicPost(makeRequest({ latitude: -26.2 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid payload', async () => {
    const res = await panicPost(makeRequest({ latitude: 'north' }));
    expect(res.status).toBe(400);
  });

  it('creates a panic alert and dispatches it', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([])) // standard seat lookup
      .mockReturnValueOnce(makeSelectChain([{ phone: '0821234567' }])) // default contact
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'alert-1',
            status: 'SENT',
            createdAt: new Date('2026-08-01T12:00:00.000Z'),
          },
        ])
      );
    mocks.dispatchPanicAlert.mockResolvedValue({ success: true, channel: 'sms_push' });

    const res = await panicPost(makeRequest({ latitude: -26.2, longitude: 28.0 }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.alert.status).toBe('SENT');
    expect(mocks.dbMock.insert).toHaveBeenCalledOnce();
    expect(mocks.dispatchPanicAlert).toHaveBeenCalledOnce();
  });

  it('marks the alert FAILED when dispatch fails', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([])) // seat lookup
      .mockReturnValueOnce(makeSelectChain([{ phone: '0821234567' }])); // default contact
    mocks.dispatchPanicAlert.mockResolvedValue({
      success: false,
      channel: 'none',
      errorMessage: 'Emergency dispatch is not enabled',
    });

    const res = await panicPost(makeRequest({}));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error.details.status).toBe('FAILED');
    expect(mocks.dbMock.update).toHaveBeenCalledOnce();
  });
});

describe('GET /api/security/alerts', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.sessionResult = null;
    const res = await alertsGet(new Request('http://localhost:3000/api/security/alerts'));
    expect(res.status).toBe(401);
  });

  it("returns the caller's panic alerts", async () => {
    mocks.dbMock.select.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'alert-1',
          status: 'SENT',
          createdAt: new Date('2026-08-01T12:00:00.000Z'),
          acknowledgedAt: null,
          resolvedAt: null,
        },
      ])
    );

    const res = await alertsGet(new Request('http://localhost:3000/api/security/alerts'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.alerts).toHaveLength(1);
    expect(body.data.alerts[0].id).toBe('alert-1');
  });
});

describe('POST /api/security/tips', () => {
  it('returns 400 for an empty message', async () => {
    const res = await tipsPost(makeRequest({ message: ' ' }));
    expect(res.status).toBe(400);
  });

  it('creates an anonymous tip', async () => {
    const res = await tipsPost(makeRequest({ message: 'Suspicious van on Elm street' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe('alert-1');
    expect(mocks.dbMock.insert).toHaveBeenCalledOnce();
  });

  it('returns 500 when the insert fails', async () => {
    mocks.dbMock.insert.mockReturnValue({
      values: vi.fn(() => {
        throw new Error('db down');
      }),
    });
    const res = await tipsPost(makeRequest({ message: 'Suspicious van on Elm street' }));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/security/contacts', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.sessionResult = null;
    const res = await contactsGet(new Request('http://localhost:3000/api/security/contacts'));
    expect(res.status).toBe(401);
  });

  it('returns contacts with a default target', async () => {
    mocks.dbMock.select.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'c-1',
          label: 'Main gate',
          phone: '0821',
          contactType: 'INTERNAL_SECURITY',
          isDefaultCallTarget: true,
        },
        {
          id: 'c-2',
          label: 'Armed response',
          phone: '0833',
          contactType: 'ARMED_RESPONSE',
          isDefaultCallTarget: false,
        },
      ])
    );

    const res = await contactsGet(new Request('http://localhost:3000/api/security/contacts'));
    const body = await res.json();

    expect(body.data.contacts).toHaveLength(2);
    expect(body.data.defaultContact).toEqual(
      expect.objectContaining({ id: 'c-1', isDefaultCallTarget: true })
    );
  });

  it('returns null defaultContact when none is marked default', async () => {
    mocks.dbMock.select.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'c-1',
          label: 'Main gate',
          phone: '0821',
          contactType: 'INTERNAL_SECURITY',
          isDefaultCallTarget: false,
        },
      ])
    );

    const res = await contactsGet(new Request('http://localhost:3000/api/security/contacts'));
    const body = await res.json();
    expect(body.data.defaultContact).toBeNull();
  });
});
