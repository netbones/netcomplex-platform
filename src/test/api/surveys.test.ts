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
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
  apiSuccess: vi.fn((data: unknown) => Response.json({ success: true, data }, { status: 200 })),
  apiCreated: vi.fn((data: unknown) => Response.json({ success: true, data }, { status: 201 })),
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
  apiError: vi.fn((code: string, message: string, status: number) =>
    Response.json({ success: false, error: { code, message } }, { status })
  ),
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  surveys: {
    id: 'id',
    tenantId: 'tenantId',
    title: 'title',
    description: 'description',
    type: 'type',
    status: 'status',
    startDate: 'startDate',
    endDate: 'endDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  questions: { id: 'id', surveyId: 'surveyId' },
  responses: { id: 'id', surveyId: 'surveyId' },
  users: { id: 'id', role: 'role' },
  apiSuccess: mocks.apiSuccess,
  apiCreated: mocks.apiCreated,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiError: mocks.apiError,
  withErrorHandler: (fn: Function) => fn,
  now: () => new Date('2026-06-21T00:00:00Z'),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return { ...actual, apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } };
});

import { GET, POST } from '@/app/api/surveys/route';
import { makeSelectChain } from './helpers';

function setupAuth(role: string) {
  mocks.sessionResult = { user: { id: 'user-1' } };
  mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role }]));
}

describe('Surveys API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/surveys', () => {
    it('returns 401 without auth', async () => {
      const response = await GET(new Request('http://localhost:3000/api/surveys') as any);
      expect(response.status).toBe(401);
    });

    it('returns survey list with valid auth', async () => {
      setupAuth('RESIDENT');
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ id: 's-1', title: 'Test Survey' }])
      );

      const response = await GET(new Request('http://localhost:3000/api/surveys') as any);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([{ id: 's-1', title: 'Test Survey' }]);
    });

    it('filters by status query param', async () => {
      setupAuth('RESIDENT');
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-2', status: 'ACTIVE' }]));

      const response = await GET(new Request('http://localhost:3000/api/surveys?status=ACTIVE') as any);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([{ id: 's-2', status: 'ACTIVE' }]);
    });
  });

  describe('POST /api/surveys', () => {
    it('returns 401 without auth', async () => {
      const response = await POST(
        new Request('http://localhost:3000/api/surveys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Survey' }),
        })
      );
      expect(response.status).toBe(401);
    });

    it('creates survey with ADMIN role', async () => {
      setupAuth('ADMIN');
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 's-new', title: 'New Survey' }]),
        }),
      });

      const response = await POST(
        new Request('http://localhost:3000/api/surveys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Survey', description: 'A survey' }),
        })
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: 's-new', title: 'New Survey' });
    });
  });
});
