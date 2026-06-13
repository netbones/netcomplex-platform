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
  apiNoContent: vi.fn(() => new Response(null, { status: 204 })),
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
  apiError: vi.fn((code: string, message: string, status: number) =>
    Response.json({ success: false, error: { code, message } }, { status })
  ),
  apiInternalError: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: message || 'Internal server error' },
      },
      { status: 500 }
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
    config: 'config',
  },
  questions: {
    id: 'id',
    tenantId: 'tenantId',
    surveyId: 'surveyId',
    sectionId: 'sectionId',
    text: 'text',
    type: 'type',
    options: 'options',
    required: 'required',
    order: 'order',
    config: 'config',
  },
  responses: { id: 'id', surveyId: 'surveyId', userId: 'userId', answers: 'answers' },
  surveySections: {
    id: 'id',
    tenantId: 'tenantId',
    surveyId: 'surveyId',
    title: 'title',
    description: 'description',
    image: 'image',
    order: 'order',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  externalSurveys: {
    id: 'id',
    tenantId: 'tenantId',
    name: 'name',
    provider: 'provider',
    externalId: 'externalId',
    embedUrl: 'embedUrl',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  users: { id: 'id', role: 'role', name: 'name' },
  apiSuccess: mocks.apiSuccess,
  apiCreated: mocks.apiCreated,
  apiNoContent: mocks.apiNoContent,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiNotFound: mocks.apiNotFound,
  apiValidationError: mocks.apiValidationError,
  apiError: mocks.apiError,
  apiInternalError: mocks.apiInternalError,
}));

vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  };
});

import { GET as listSurveys, POST as createSurvey } from '@/app/api/surveys/route';
import { GET as getSurvey, PUT as updateSurvey } from '@/app/api/surveys/[id]/route';
import { POST as createQuestion } from '@/app/api/surveys/[id]/questions/route';
import {
  PATCH as updateQuestion,
  DELETE as deleteQuestion,
} from '@/app/api/surveys/[id]/questions/[questionId]/route';
import { POST as reorderQuestions } from '@/app/api/surveys/[id]/questions/reorder/route';
import { GET as listSections, POST as createSection } from '@/app/api/surveys/[id]/sections/route';
import {
  PATCH as updateSection,
  DELETE as deleteSection,
} from '@/app/api/surveys/[id]/sections/[sectionId]/route';
import { POST as reorderSections } from '@/app/api/surveys/[id]/sections/reorder/route';
import { GET as surveyResponses } from '@/app/api/surveys/[id]/responses/route';
import {
  GET as listExternal,
  POST as createExternal,
  PATCH as updateExternal,
  DELETE as deleteExternal,
} from '@/app/api/external-surveys/route';
import { makeSelectChain } from './helpers';

function setupAuthAdmin() {
  mocks.sessionResult = { user: { id: 'user-1' } };
  mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'ADMIN' }]));
}

function setupAuthResident() {
  mocks.sessionResult = { user: { id: 'user-1' } };
  mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));
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
      const request = new Request('http://localhost:3000/api/surveys');
      const response = await listSurveys(request);
      expect(response.status).toBe(401);
    });

    it('returns survey list with valid auth', async () => {
      setupAuthResident();
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ id: 's-1', title: 'Test Survey' }])
      );

      const request = new Request('http://localhost:3000/api/surveys');
      const response = await listSurveys(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([{ id: 's-1', title: 'Test Survey' }]);
    });

    it('filters by status query param', async () => {
      setupAuthResident();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-2', status: 'ACTIVE' }]));

      const request = new Request('http://localhost:3000/api/surveys?status=ACTIVE');
      const response = await listSurveys(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([{ id: 's-2', status: 'ACTIVE' }]);
    });
  });

  describe('POST /api/surveys', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Survey' }),
      });
      const response = await createSurvey(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT without content permission', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Survey' }),
      });
      const response = await createSurvey(request);
      expect(response.status).toBe(403);
    });

    it('returns 403 when role has no content permission', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'GROUP_ADMIN' }]));

      const request = new Request('http://localhost:3000/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Survey' }),
      });
      const response = await createSurvey(request);
      expect(response.status).toBe(403);
    });

    it('creates survey with ADMIN role', async () => {
      setupAuthAdmin();
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 's-new', title: 'New Survey' }]),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Survey', description: 'A survey', type: 'INTERNAL' }),
      });
      const response = await createSurvey(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: 's-new', title: 'New Survey' });
    });

    it('creates survey with BOARD role', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'BOARD' }]));
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 's-b', title: 'Board Survey' }]),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Board Survey' }),
      });
      const response = await createSurvey(request);

      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/surveys/[id]', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1');
      const response = await getSurvey(request, { params: Promise.resolve({ id: 's-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 404 when survey not found', async () => {
      setupAuthResident();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1');
      const response = await getSurvey(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(404);
    });

    it('returns survey with sections and questions for valid auth', async () => {
      setupAuthResident();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 's-1', title: 'Survey 1' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'sec-1', title: 'Section 1', order: 1 }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'q-1', text: 'Question 1', order: 1 }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1');
      const response = await getSurvey(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.survey).toEqual({ id: 's-1', title: 'Survey 1' });
      expect(body.data.sections).toEqual([{ id: 'sec-1', title: 'Section 1', order: 1 }]);
      expect(body.data.questions).toEqual([{ id: 'q-1', text: 'Question 1', order: 1 }]);
    });

    it('allows RESIDENT to fetch survey details', async () => {
      setupAuthResident();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 's-1', title: 'Survey 1' }]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1');
      const response = await getSurvey(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/surveys/[id]', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });
      const response = await updateSurvey(request, { params: Promise.resolve({ id: 's-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });
      const response = await updateSurvey(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 404 when survey not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });
      const response = await updateSurvey(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(404);
    });

    it('updates survey fields for ADMIN', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]));
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 's-1', title: 'Updated Title' }]),
          }),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title', status: 'ACTIVE' }),
      });
      const response = await updateSurvey(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Updated Title');
    });
  });

  describe('POST /api/surveys/[id]/questions', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'New Q', type: 'TEXT' }),
      });
      const response = await createQuestion(request, { params: Promise.resolve({ id: 's-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'New Q', type: 'TEXT' }),
      });
      const response = await createQuestion(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 404 when survey not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'New Q', type: 'TEXT' }),
      });
      const response = await createQuestion(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(404);
    });

    it('returns 422 when text is missing', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'TEXT' }),
      });
      const response = await createQuestion(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(422);
    });

    it('returns 422 when type is invalid', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'New Q', type: 'INVALID_TYPE' }),
      });
      const response = await createQuestion(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(422);
    });

    it('returns 422 when options is not an array', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'New Q', type: 'SINGLE_CHOICE', options: 'not-an-array' }),
      });
      const response = await createQuestion(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(422);
    });

    it('creates question with valid TEXT type and auto-assigned order', async () => {
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ maxOrder: 2 }]));
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([{ id: 'q-new', text: 'New Q', type: 'TEXT', order: 3 }]),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'New Q', type: 'TEXT', required: true }),
      });
      const response = await createQuestion(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data).toEqual({ id: 'q-new', text: 'New Q', type: 'TEXT', order: 3 });
    });

    it('defaults options for SINGLE_CHOICE when not provided', async () => {
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ maxOrder: 0 }]));
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([{ id: 'q-c', text: 'Choice Q', type: 'SINGLE_CHOICE' }]),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Choice Q', type: 'SINGLE_CHOICE' }),
      });
      const response = await createQuestion(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(201);
    });
  });

  describe('PATCH /api/surveys/[id]/questions/[questionId]', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/q-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Updated' }),
      });
      const response = await updateQuestion(request, {
        params: Promise.resolve({ id: 's-1', questionId: 'q-1' }),
      });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/q-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Updated' }),
      });
      const response = await updateQuestion(request, {
        params: Promise.resolve({ id: 's-1', questionId: 'q-1' }),
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 when question not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/q-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Updated' }),
      });
      const response = await updateQuestion(request, {
        params: Promise.resolve({ id: 's-1', questionId: 'q-1' }),
      });

      expect(response.status).toBe(404);
    });

    it('returns 422 when text is not a string', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'q-1', text: 'Old' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/q-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 123 }),
      });
      const response = await updateQuestion(request, {
        params: Promise.resolve({ id: 's-1', questionId: 'q-1' }),
      });

      expect(response.status).toBe(422);
    });

    it('returns 422 when type is invalid', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'q-1' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/q-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'BOGUS' }),
      });
      const response = await updateQuestion(request, {
        params: Promise.resolve({ id: 's-1', questionId: 'q-1' }),
      });

      expect(response.status).toBe(422);
    });

    it('updates question text for ADMIN', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'q-1', text: 'Old' }]));
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'q-1', text: 'Updated Text' }]),
          }),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/q-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Updated Text' }),
      });
      const response = await updateQuestion(request, {
        params: Promise.resolve({ id: 's-1', questionId: 'q-1' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.text).toBe('Updated Text');
    });
  });

  describe('DELETE /api/surveys/[id]/questions/[questionId]', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/q-1', {
        method: 'DELETE',
      });
      const response = await deleteQuestion(request, {
        params: Promise.resolve({ id: 's-1', questionId: 'q-1' }),
      });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/q-1', {
        method: 'DELETE',
      });
      const response = await deleteQuestion(request, {
        params: Promise.resolve({ id: 's-1', questionId: 'q-1' }),
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 when question not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/q-1', {
        method: 'DELETE',
      });
      const response = await deleteQuestion(request, {
        params: Promise.resolve({ id: 's-1', questionId: 'q-1' }),
      });

      expect(response.status).toBe(404);
    });

    it('deletes question and returns 204 for ADMIN', async () => {
      setupAuthAdmin();
      mocks.dbMock.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'q-1' }]),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/q-1', {
        method: 'DELETE',
      });
      const response = await deleteQuestion(request, {
        params: Promise.resolve({ id: 's-1', questionId: 'q-1' }),
      });

      expect(response.status).toBe(204);
    });
  });

  describe('POST /api/surveys/[id]/questions/reorder', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'q-1', order: 1 }] }),
      });
      const response = await reorderQuestions(request, { params: Promise.resolve({ id: 's-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'q-1', order: 1 }] }),
      });
      const response = await reorderQuestions(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 404 when survey not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'q-1', order: 1 }] }),
      });
      const response = await reorderQuestions(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(404);
    });

    it('returns 422 when items is empty array', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      });
      const response = await reorderQuestions(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(422);
    });

    it('returns 422 when items is missing', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const response = await reorderQuestions(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(422);
    });

    it('returns 422 when item has numeric id', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 123, order: 1 }] }),
      });
      const response = await reorderQuestions(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(422);
    });

    it('returns 422 when item missing order', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'q-1' }] }),
      });
      const response = await reorderQuestions(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(422);
    });

    it('returns 404 when question IDs do not match existing questions', async () => {
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'q-1' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: 'q-1', order: 1 },
            { id: 'q-2', order: 2 },
          ],
        }),
      });
      const response = await reorderQuestions(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(404);
    });

    it('reorders questions successfully for ADMIN', async () => {
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'q-1' }, { id: 'q-2' }]));
      mocks.dbMock.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: 'q-1', order: 1 },
            { id: 'q-2', order: 2 },
          ],
        }),
      });
      const response = await reorderQuestions(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.reordered).toBe(2);
    });
  });

  describe('GET /api/surveys/[id]/sections', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1/sections');
      const response = await listSections(request, { params: Promise.resolve({ id: 's-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections');
      const response = await listSections(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 404 when survey not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections');
      const response = await listSections(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(404);
    });

    it('returns sections with nested questions', async () => {
      setupAuthAdmin();
      const sections = [{ id: 'sec-1', title: 'Section 1', order: 1 }];
      const sectionQuestions = [{ id: 'q-1', text: 'Q1', sectionId: 'sec-1', order: 1 }];
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]))
        .mockReturnValueOnce(makeSelectChain(sections))
        .mockReturnValueOnce(makeSelectChain(sectionQuestions));

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections');
      const response = await listSections(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data[0].questions).toEqual(sectionQuestions);
    });
  });

  describe('POST /api/surveys/[id]/sections', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Section' }),
      });
      const response = await createSection(request, { params: Promise.resolve({ id: 's-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Section' }),
      });
      const response = await createSection(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 404 when survey not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Section' }),
      });
      const response = await createSection(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(404);
    });

    it('creates section with auto-assigned order', async () => {
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ maxOrder: 1 }]));
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'sec-new', title: 'New Section', order: 2 }]),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Section' }),
      });
      const response = await createSection(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.title).toBe('New Section');
    });
  });

  describe('PATCH /api/surveys/[id]/sections/[sectionId]', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/sec-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });
      const response = await updateSection(request, {
        params: Promise.resolve({ id: 's-1', sectionId: 'sec-1' }),
      });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/sec-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });
      const response = await updateSection(request, {
        params: Promise.resolve({ id: 's-1', sectionId: 'sec-1' }),
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 when section not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/sec-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });
      const response = await updateSection(request, {
        params: Promise.resolve({ id: 's-1', sectionId: 'sec-1' }),
      });

      expect(response.status).toBe(404);
    });

    it('updates section title for ADMIN', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'sec-1', title: 'Old' }]));
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'sec-1', title: 'Updated Title' }]),
          }),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/sec-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const response = await updateSection(request, {
        params: Promise.resolve({ id: 's-1', sectionId: 'sec-1' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/surveys/[id]/sections/[sectionId]', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/sec-1', {
        method: 'DELETE',
      });
      const response = await deleteSection(request, {
        params: Promise.resolve({ id: 's-1', sectionId: 'sec-1' }),
      });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/sec-1', {
        method: 'DELETE',
      });
      const response = await deleteSection(request, {
        params: Promise.resolve({ id: 's-1', sectionId: 'sec-1' }),
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 when section not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/sec-1', {
        method: 'DELETE',
      });
      const response = await deleteSection(request, {
        params: Promise.resolve({ id: 's-1', sectionId: 'sec-1' }),
      });

      expect(response.status).toBe(404);
    });

    it('deletes section and returns 204 for ADMIN', async () => {
      setupAuthAdmin();
      mocks.dbMock.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'sec-1' }]),
        }),
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/sec-1', {
        method: 'DELETE',
      });
      const response = await deleteSection(request, {
        params: Promise.resolve({ id: 's-1', sectionId: 'sec-1' }),
      });

      expect(response.status).toBe(204);
    });
  });

  describe('POST /api/surveys/[id]/sections/reorder', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'sec-1', order: 1 }] }),
      });
      const response = await reorderSections(request, { params: Promise.resolve({ id: 's-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'sec-1', order: 1 }] }),
      });
      const response = await reorderSections(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 404 when survey not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'sec-1', order: 1 }] }),
      });
      const response = await reorderSections(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(404);
    });

    it('returns 422 when items is empty', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      });
      const response = await reorderSections(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(422);
    });

    it('reorders sections successfully', async () => {
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 's-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'sec-1' }, { id: 'sec-2' }]));
      mocks.dbMock.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const request = new Request('http://localhost:3000/api/surveys/s-1/sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: 'sec-1', order: 1 },
            { id: 'sec-2', order: 2 },
          ],
        }),
      });
      const response = await reorderSections(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.reordered).toBe(2);
    });
  });

  describe('GET /api/surveys/[id]/responses', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/surveys/s-1/responses');
      const response = await surveyResponses(request, { params: Promise.resolve({ id: 's-1' }) });
      expect(response.status).toBe(401);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/surveys/s-1/responses');
      const response = await surveyResponses(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(403);
    });

    it('returns 404 when survey not found', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/responses');
      const response = await surveyResponses(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(404);
    });

    it('returns empty aggregated responses for survey with no responses', async () => {
      const surveyData = { id: 's-1', title: 'Test Survey', status: 'ACTIVE', type: 'INTERNAL' };
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([surveyData]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/surveys/s-1/responses');
      const response = await surveyResponses(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.totalResponses).toBe(0);
      expect(body.data.questions).toEqual([]);
    });

    it('aggregates RATING question responses', async () => {
      const surveyData = { id: 's-1', title: 'Test', status: 'ACTIVE', type: 'INTERNAL' };
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([surveyData]))
        .mockReturnValueOnce(
          makeSelectChain([{ id: 'q-1', text: 'Rate', type: 'RATING', options: null }])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            { id: 'r-1', surveyId: 's-1', answers: { 'q-1': 5 } },
            { id: 'r-2', surveyId: 's-1', answers: { 'q-1': 3 } },
          ])
        );

      const request = new Request('http://localhost:3000/api/surveys/s-1/responses');
      const response = await surveyResponses(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.totalResponses).toBe(2);
      const qData = body.data.questions[0];
      expect(qData.responses.total).toBe(2);
      expect(qData.responses.average).toBe(4);
      expect(qData.responses.distribution).toEqual({ '1': 0, '2': 0, '3': 1, '4': 0, '5': 1 });
    });

    it('aggregates TEXT question responses', async () => {
      const surveyData = { id: 's-1', title: 'Test', status: 'ACTIVE', type: 'INTERNAL' };
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([surveyData]))
        .mockReturnValueOnce(
          makeSelectChain([{ id: 'q-1', text: 'Comment', type: 'TEXT', options: null }])
        )
        .mockReturnValueOnce(
          makeSelectChain([{ id: 'r-1', surveyId: 's-1', answers: { 'q-1': 'Great!' } }])
        );

      const request = new Request('http://localhost:3000/api/surveys/s-1/responses');
      const response = await surveyResponses(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      const qData = body.data.questions[0];
      expect(qData.responses.total).toBe(1);
      expect(qData.responses.texts).toEqual(['Great!']);
    });

    it('aggregates SINGLE_CHOICE question responses', async () => {
      const surveyData = { id: 's-1', title: 'Test', status: 'ACTIVE', type: 'INTERNAL' };
      setupAuthAdmin();
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([surveyData]))
        .mockReturnValueOnce(
          makeSelectChain([
            { id: 'q-1', text: 'Choose', type: 'SINGLE_CHOICE', options: ['A', 'B'] },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            { id: 'r-1', surveyId: 's-1', answers: { 'q-1': 'A' } },
            { id: 'r-2', surveyId: 's-1', answers: { 'q-1': 'B' } },
            { id: 'r-3', surveyId: 's-1', answers: { 'q-1': 'A' } },
          ])
        );

      const request = new Request('http://localhost:3000/api/surveys/s-1/responses');
      const response = await surveyResponses(request, { params: Promise.resolve({ id: 's-1' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      const qData = body.data.questions[0];
      expect(qData.responses.distribution).toEqual({ A: 2, B: 1 });
    });
  });

  describe('GET /api/external-surveys', () => {
    it('returns 403 without auth', async () => {
      const request = new Request('http://localhost:3000/api/external-surveys');
      const response = await listExternal(request);
      expect(response.status).toBe(403);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/external-surveys');
      const response = await listExternal(request);

      expect(response.status).toBe(403);
    });

    it('returns list with ADMIN role', async () => {
      setupAuthAdmin();
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ id: 'ext-1', name: 'External Survey', provider: 'bitlabs' }])
      );

      const request = new Request('http://localhost:3000/api/external-surveys');
      const response = await listExternal(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([{ id: 'ext-1', name: 'External Survey', provider: 'bitlabs' }]);
    });
  });

  describe('POST /api/external-surveys', () => {
    it('returns 403 without auth', async () => {
      const request = new Request('http://localhost:3000/api/external-surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New',
          provider: 'bitlabs',
          externalId: 'ext-1',
          embedUrl: 'https://example.com',
        }),
      });
      const response = await createExternal(request);
      expect(response.status).toBe(403);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/external-surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New',
          provider: 'bitlabs',
          externalId: 'ext-1',
          embedUrl: 'https://example.com',
        }),
      });
      const response = await createExternal(request);

      expect(response.status).toBe(403);
    });

    it('creates external survey for ADMIN', async () => {
      setupAuthAdmin();
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([{ id: 'ext-new', name: 'New', provider: 'bitlabs' }]),
        }),
      });

      const request = new Request('http://localhost:3000/api/external-surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New',
          provider: 'bitlabs',
          externalId: 'ext-1',
          embedUrl: 'https://example.com',
        }),
      });
      const response = await createExternal(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.name).toBe('New');
    });
  });

  describe('PATCH /api/external-surveys', () => {
    it('returns 403 without auth', async () => {
      const request = new Request('http://localhost:3000/api/external-surveys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'ext-1', name: 'Updated', isActive: true }),
      });
      const response = await updateExternal(request);
      expect(response.status).toBe(403);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/external-surveys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'ext-1', name: 'Updated', isActive: true }),
      });
      const response = await updateExternal(request);

      expect(response.status).toBe(403);
    });

    it('updates external survey for ADMIN', async () => {
      setupAuthAdmin();
      mocks.dbMock.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'ext-1', name: 'Updated' }]),
          }),
        }),
      });

      const request = new Request('http://localhost:3000/api/external-surveys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'ext-1', name: 'Updated', isActive: true }),
      });
      const response = await updateExternal(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.name).toBe('Updated');
    });
  });

  describe('DELETE /api/external-surveys', () => {
    it('returns 400 when no id provided (with auth)', async () => {
      setupAuthAdmin();

      const request = new Request('http://localhost:3000/api/external-surveys', {
        method: 'DELETE',
      });
      const response = await deleteExternal(request);
      expect(response.status).toBe(400);
    });

    it('returns 403 without auth', async () => {
      const request = new Request('http://localhost:3000/api/external-surveys?id=ext-1', {
        method: 'DELETE',
      });
      const response = await deleteExternal(request);
      expect(response.status).toBe(403);
    });

    it('returns 403 for RESIDENT', async () => {
      setupAuthResident();

      const request = new Request('http://localhost:3000/api/external-surveys?id=ext-1', {
        method: 'DELETE',
      });
      const response = await deleteExternal(request);

      expect(response.status).toBe(403);
    });

    it('deletes external survey for ADMIN', async () => {
      setupAuthAdmin();
      mocks.dbMock.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const request = new Request('http://localhost:3000/api/external-surveys?id=ext-1', {
        method: 'DELETE',
      });
      const response = await deleteExternal(request);

      expect(response.status).toBe(200);
    });
  });
});
