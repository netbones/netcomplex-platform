/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
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

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  surveySections: {
    id: 'id',
    surveyId: 'surveyId',
    tenantId: 'tenantId',
    title: 'title',
    order: 'order',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  surveys: { id: 'id', tenantId: 'tenantId' },
  users: { id: 'id', role: 'role' },
  apiSuccess: mocks.apiSuccess,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiNotFound: mocks.apiNotFound,
  apiValidationError: mocks.apiValidationError,
  withErrorHandler: (handler: any) => handler,
  now: () => new Date('2026-06-21T00:00:00Z'),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: (role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'content')
      return role === 'ADMIN' || role === 'MANAGER' || role === 'COMMITTEE';
    return false;
  },
}));

import { POST } from '@/app/api/surveys/[id]/sections/reorder/route';

const SURVEY_ID = 'survey-1';

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/surveys/${SURVEY_ID}/sections/reorder`, {
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
  mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role }]));
}

describe('POST /api/surveys/[id]/sections/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const res = await POST(
      makeRequest({ items: [{ id: 'sec-1', order: 1 }] }),
      makeParams(SURVEY_ID)
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for RESIDENT role', async () => {
    setupAuth('RESIDENT');

    const res = await POST(
      makeRequest({ items: [{ id: 'sec-1', order: 1 }] }),
      makeParams(SURVEY_ID)
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when survey does not exist', async () => {
    setupAuth('ADMIN');
    // Survey lookup → empty (not found)
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

    const res = await POST(
      makeRequest({ items: [{ id: 'sec-1', order: 1 }] }),
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
      makeRequest({ items: [{ id: 'sec-1', order: 'invalid' }] }),
      makeParams(SURVEY_ID)
    );
    expect(res.status).toBe(422);
  });

  it('returns 404 when section IDs not found in survey', async () => {
    setupAuth('ADMIN');
    // Survey lookup → found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: SURVEY_ID }]));
    // Sections lookup → only 1 of 2 found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'sec-1' }]));

    const res = await POST(
      makeRequest({
        items: [
          { id: 'sec-1', order: 1 },
          { id: 'sec-2', order: 2 },
        ],
      }),
      makeParams(SURVEY_ID)
    );
    expect(res.status).toBe(404);
  });

  it('reorders sections successfully', async () => {
    setupAuth('ADMIN');
    // Survey lookup → found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: SURVEY_ID }]));
    // Sections lookup → all found
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'sec-1' }, { id: 'sec-2' }]));

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
          { id: 'sec-1', order: 2 },
          { id: 'sec-2', order: 1 },
        ],
      }),
      makeParams(SURVEY_ID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.reordered).toBe(2);
    expect(txMock.update).toHaveBeenCalledTimes(2);

    // Verify updatedAt is set by the route
    const setArg = txMock.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setArg).toHaveProperty('updatedAt');
    expect(setArg).toHaveProperty('order');
  });

  it('reorders single section', async () => {
    setupAuth('ADMIN');
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: SURVEY_ID }]));
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'sec-1' }]));

    const txMock = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };
    mocks.dbMock.transaction.mockImplementation(async (fn: any) => fn(txMock));

    const res = await POST(
      makeRequest({ items: [{ id: 'sec-1', order: 3 }] }),
      makeParams(SURVEY_ID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.reordered).toBe(1);
  });
});
