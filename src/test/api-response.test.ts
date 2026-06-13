import { describe, it, expect, vi } from 'vitest';

vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    constructor(body: BodyInit | null, init?: ResponseInit) {
      super(body, init);
    }
    static json(body: unknown, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(body), init);
    }
  }
  return {
    NextResponse: MockNextResponse,
    NextRequest: vi.fn(),
  };
});

import {
  apiSuccess,
  apiError,
  apiPaginated,
  apiCreated,
  apiNoContent,
  apiUnauthorized,
  apiForbidden,
  apiTenantRequired,
  apiTenantForbidden,
  apiValidationError,
  apiNotFound,
  apiSuspendedUser,
  apiInternalError,
  ERROR_CODES,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiPaginatedMeta,
} from '@api/server';

describe('api-response', () => {
  describe('apiSuccess', () => {
    it('returns correct shape with data only', async () => {
      const res = apiSuccess({ id: '1', name: 'test' });
      const body = await res.json();
      expect(body).toEqual({
        success: true,
        data: { id: '1', name: 'test' },
      });
      expect(res.status).toBe(200);
    });

    it('returns correct shape with data and meta', async () => {
      const res = apiSuccess([1, 2, 3], { count: 3 });
      const body = await res.json();
      expect(body).toEqual({
        success: true,
        data: [1, 2, 3],
        meta: { count: 3 },
      });
      expect(res.status).toBe(200);
    });

    it('accepts custom status code', async () => {
      const res = apiSuccess(null, undefined, 201);
      expect(res.status).toBe(201);
    });

    it('omits meta when not provided', async () => {
      const res = apiSuccess({ ok: true });
      const body = await res.json();
      expect(body.meta).toBeUndefined();
    });
  });

  describe('apiError', () => {
    it('returns correct shape with code and message', async () => {
      const res = apiError('NOT_FOUND', 'Resource not found', 404);
      const body = await res.json();
      expect(body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
      expect(res.status).toBe(404);
    });

    it('includes details when provided', async () => {
      const details = { field: 'email', reason: 'already taken' };
      const res = apiError('VALIDATION_ERROR', 'Validation failed', 422, details);
      const body = await res.json();
      expect(body.error.details).toEqual(details);
    });

    it('omits details when not provided', async () => {
      const res = apiError('INTERNAL_ERROR', 'Server error', 500);
      const body = await res.json();
      expect(body.error.details).toBeUndefined();
    });
  });

  describe('apiPaginated', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

    it('sets hasMore correctly when more pages exist', async () => {
      const res = apiPaginated(items, 1, 2, 5);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(items);
      expect(body.meta).toEqual({
        page: 1,
        pageSize: 2,
        total: 5,
        hasMore: true,
      });
    });

    it('sets hasMore to false on last page', async () => {
      const res = apiPaginated(items, 2, 2, 4);
      const body = await res.json();
      expect(body.meta.hasMore).toBe(false);
    });

    it('sets hasMore to false when exact boundary (page * pageSize === total)', async () => {
      const res = apiPaginated(items, 2, 2, 4);
      const body = await res.json();
      // page 2, pageSize 2: 2 * 2 = 4, which equals total, so no more
      expect(body.meta.hasMore).toBe(false);
    });

    it('sets hasMore to true when page * pageSize < total', async () => {
      const res = apiPaginated(items, 1, 2, 5);
      const body = await res.json();
      // page 1, pageSize 2: 1 * 2 = 2 < 5, so hasMore
      expect(body.meta.hasMore).toBe(true);
    });

    it('handles empty data set', async () => {
      const res = apiPaginated([], 1, 10, 0);
      const body = await res.json();
      expect(body.data).toEqual([]);
      expect(body.meta.hasMore).toBe(false);
      expect(body.meta.total).toBe(0);
    });
  });

  describe('apiCreated', () => {
    it('returns 201 status', async () => {
      const res = apiCreated({ id: 'new-id' });
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: 'new-id' });
      expect(res.status).toBe(201);
    });
  });

  describe('apiNoContent', () => {
    it('returns 204 status with no body', () => {
      const res = apiNoContent();
      expect(res.status).toBe(204);
    });
  });

  describe('convenience error wrappers', () => {
    it('apiUnauthorized returns 401 with AUTH_REQUIRED code', async () => {
      const res = apiUnauthorized();
      const body = await res.json();
      expect(body.error.code).toBe(ERROR_CODES.AUTH_REQUIRED);
      expect(res.status).toBe(401);
    });

    it('apiUnauthorized accepts custom message', async () => {
      const res = apiUnauthorized('Login required');
      const body = await res.json();
      expect(body.error.message).toBe('Login required');
    });

    it('apiForbidden returns 403 with FORBIDDEN code', async () => {
      const res = apiForbidden();
      const body = await res.json();
      expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
      expect(res.status).toBe(403);
    });

    it('apiTenantRequired returns 400 with TENANT_REQUIRED code', async () => {
      const res = apiTenantRequired();
      const body = await res.json();
      expect(body.error.code).toBe(ERROR_CODES.TENANT_REQUIRED);
      expect(res.status).toBe(400);
    });

    it('apiTenantForbidden returns 403 with TENANT_FORBIDDEN code', async () => {
      const res = apiTenantForbidden();
      const body = await res.json();
      expect(body.error.code).toBe(ERROR_CODES.TENANT_FORBIDDEN);
      expect(res.status).toBe(403);
    });

    it('apiValidationError returns 422 with VALIDATION_ERROR code and details', async () => {
      const details = [{ field: 'name', message: 'Required' }];
      const res = apiValidationError(details);
      const body = await res.json();
      expect(body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(res.status).toBe(422);
      expect(body.error.details).toEqual(details);
    });

    it('apiNotFound returns 404 with NOT_FOUND code', async () => {
      const res = apiNotFound();
      const body = await res.json();
      expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(res.status).toBe(404);
    });

    it('apiNotFound accepts custom message', async () => {
      const res = apiNotFound('User not found');
      const body = await res.json();
      expect(body.error.message).toBe('User not found');
    });

    it('apiSuspendedUser returns 403 with SUSPENDED_USER code and details', async () => {
      const details = { id: '1', reason: 'Violation' };
      const res = apiSuspendedUser(details);
      const body = await res.json();
      expect(body.error.code).toBe(ERROR_CODES.SUSPENDED_USER);
      expect(res.status).toBe(403);
      expect(body.error.details).toEqual(details);
    });

    it('apiInternalError returns 500 with INTERNAL_ERROR code', async () => {
      const res = apiInternalError();
      const body = await res.json();
      expect(body.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(res.status).toBe(500);
    });

    it('all convenience wrappers return error shapes without success true', async () => {
      const wrappers = [
        apiUnauthorized(),
        apiForbidden(),
        apiTenantRequired(),
        apiTenantForbidden(),
        apiValidationError(),
        apiNotFound(),
        apiSuspendedUser(),
        apiInternalError(),
      ];
      for (const res of wrappers) {
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).toBeDefined();
        expect(body.error.code).toBeDefined();
        expect(body.error.message).toBeDefined();
      }
    });
  });
});
