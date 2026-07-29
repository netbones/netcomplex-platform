/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  mockRole: 'ADMIN' as string,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
  apiSuccess: vi.fn((data: unknown) => Response.json({ success: true, data }, { status: 200 })),
  apiUnauthorized: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'AUTH_REQUIRED', message: message || 'Authentication required' },
      },
      { status: 401 }
    )
  ),
  apiForbidden: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'FORBIDDEN', message: message || 'Forbidden' } },
      { status: 403 }
    )
  ),
  apiNotFound: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: message || 'Not found' } },
      { status: 404 }
    )
  ),
  apiValidationError: vi.fn((details?: unknown) =>
    Response.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
      },
      { status: 422 }
    )
  ),
}));

vi.mock('@/shared/api/auth-utils', () => ({
  requireAuth: vi.fn(async (_request: Request) => {
    if (!mocks.sessionResult) {
      return {
        success: false as const,
        response: new Response(
          JSON.stringify({
            success: false,
            error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
    return {
      success: true as const,
      data: {
        session: { user: { id: mocks.sessionResult.user.id, email: '', name: '', image: null } },
        userId: mocks.sessionResult.user.id,
        role: mocks.mockRole,
        tenantId: mocks.tenantResult.tenantId,
        suspension: null,
      },
    };
  }),
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  questions: {
    id: 'id',
    surveyId: 'surveyId',
    tenantId: 'tenantId',
    order: 'order',
    sectionId: 'sectionId',
  },
  surveys: { id: 'id', tenantId: 'tenantId' },
  users: { id: 'id', role: 'role' },
  getSessionAndRole: vi.fn(() => {
    if (!mocks.sessionResult) return Promise.resolve(null);
    return Promise.resolve({
      session: { user: { id: mocks.sessionResult.user.id } },
      userId: mocks.sessionResult.user.id,
      role: mocks.mockRole,
      suspension: null,
    });
  }),
  guardSuspension: vi.fn(() => null),
  apiSuccess: mocks.apiSuccess,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiNotFound: mocks.apiNotFound,
  apiValidationError: mocks.apiValidationError,
  apiError: vi.fn((code: string, message: string, status: number) =>
    Response.json({ success: false, error: { code, message } }, { status })
  ),
  withErrorHandler: (handler: any) => handler,
  now: () => new Date('2026-06-21T00:00:00Z'),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  assertModuleEnabled: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'content')
      return role === 'ADMIN' || role === 'MANAGER' || role === 'COMMITTEE';
    return false;
  },
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { POST } from '@/app/api/surveys/[id]/questions/reorder/route';

const SURVEY_ID = 'survey-1';

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/surveys/${SURVEY_ID}/questions/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function setupAuth(role: string) {
  mocks.sessionResult = { user: { id: 'user-1' } };
  mocks.mockRole = role;
}

describe('POST /api/surveys/[id]/questions/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.mockRole = 'ADMIN';
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const res = await POST(
      makeRequest({ items: [{ id: 'q-1', order: 1 }] }),
      makeParams(SURVEY_ID)
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for RESIDENT role', async () => {
    setupAuth('RESIDENT');

    const res = await POST(
      makeRequest({ items: [{ id: 'q-1', order: 1 }] }),
      makeParams(SURVEY_ID)
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when survey does not exist', async () => {
    setupAuth('ADMIN');
    // Survey lookup → empty (not found)
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

    const res = await POST(
      makeRequest({ items: [{ id: 'q-1', order: 1 }] }),
      makeParams(SURVEY_ID)
    );
    expect(res.status).toBe(404);
  });

  it('returns 422 when items is missing', async () => {
    setupAuth('ADMIN');
    // Survey lookup → found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: SURVEY_ID }]));

    const res = await POST(makeRequest({}), makeParams(SURVEY_ID));
    expect(res.status).toBe(422);
  });

  it('returns 422 when items is empty array', async () => {
    setupAuth('ADMIN');
    // Survey lookup → found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: SURVEY_ID }]));

    const res = await POST(makeRequest({ items: [] }), makeParams(SURVEY_ID));
    expect(res.status).toBe(422);
  });

  it('returns 422 when item missing id', async () => {
    setupAuth('ADMIN');
    // Survey lookup → found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: SURVEY_ID }]));

    const res = await POST(makeRequest({ items: [{ order: 1 }] }), makeParams(SURVEY_ID));
    expect(res.status).toBe(422);
  });

  it('returns 422 when item missing numeric order', async () => {
    setupAuth('ADMIN');
    // Survey lookup → found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: SURVEY_ID }]));

    const res = await POST(
      makeRequest({ items: [{ id: 'q-1', order: 'invalid' }] }),
      makeParams(SURVEY_ID)
    );
    expect(res.status).toBe(422);
  });

  it('returns 404 when question IDs not found in survey', async () => {
    setupAuth('ADMIN');
    // Survey lookup → found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: SURVEY_ID }]));
    // Questions lookup → only 1 of 2 found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'q-1' }]));

    const res = await POST(
      makeRequest({
        items: [
          { id: 'q-1', order: 1 },
          { id: 'q-2', order: 2 },
        ],
      }),
      makeParams(SURVEY_ID)
    );
    expect(res.status).toBe(404);
  });

  it('reorders questions successfully', async () => {
    setupAuth('ADMIN');
    // Survey lookup → found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: SURVEY_ID }]));
    // Questions lookup → all found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'q-1' }, { id: 'q-2' }]));

    const txMock = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };
    mocks.dbMock.transaction.mockImplementation(async (fn: any) => fn(txMock));

    const res = await POST(
      makeRequest({
        items: [
          { id: 'q-1', order: 2, sectionId: 'sec-1' },
          { id: 'q-2', order: 1, sectionId: null },
        ],
      }),
      makeParams(SURVEY_ID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.reordered).toBe(2);
    expect(txMock.update).toHaveBeenCalledTimes(2);
  });

  it('allows reorder without sectionId in payload', async () => {
    setupAuth('ADMIN');
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: SURVEY_ID }]));
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'q-1' }]));

    const txMock = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };
    mocks.dbMock.transaction.mockImplementation(async (fn: any) => fn(txMock));

    const res = await POST(
      makeRequest({ items: [{ id: 'q-1', order: 5 }] }),
      makeParams(SURVEY_ID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.reordered).toBe(1);
    // sectionId should not be in the update set
    const updateSet = txMock.update.mock.results[0].value.set.mock.calls[0][0];
    expect(updateSet).not.toHaveProperty('sectionId');
  });
});
