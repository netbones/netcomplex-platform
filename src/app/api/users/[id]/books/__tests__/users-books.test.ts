/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeUpdateChain } from '@/test/api/helpers';

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
  getSessionAndRole: vi.fn(),
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    db: mocks.dbMock,
    users: {
      id: 'id',
      tenantId: 'tenantId',
      books: 'books',
    },
    getSessionAndRole: (...args: unknown[]) => mocks.getSessionAndRole(...args),
    apiSuccess: (data: unknown, _meta?: unknown, status = 200, init?: ResponseInit) =>
      NextResponse.json({ success: true, data }, { status, ...(init || {}) }) as any,
    apiNotFound: (message = 'Not found') =>
      NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message } },
        { status: 404 }
      ) as any,
    apiError: (code: string, message: string, status: number = 500) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    withErrorHandler: (handler: any) => handler,
    now: () => new Date('2026-06-21T12:00:00Z'),
    CACHE_TAGS: { SETTINGS: 'settings' },
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

import { GET, POST } from '@/app/api/users/[id]/books/route';

describe('Users Books API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-1', role: 'RESIDENT' });
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/users/[id]/books', () => {
    it('returns 401 without auth session', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const res = await GET(new Request('http://localhost/api/users/user-1/books'), {
        params: Promise.resolve({ id: 'user-1' }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 401 when requesting another user's books as non-admin", async () => {
      mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-2', role: 'RESIDENT' });

      const res = await GET(new Request('http://localhost/api/users/user-1/books'), {
        params: Promise.resolve({ id: 'user-1' }),
      });

      expect(res.status).toBe(401);
    });

    it("allows ADMIN to view any user's books", async () => {
      mocks.getSessionAndRole.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ books: [{ id: 'book-1', title: 'Test Book' }] }])
      );

      const res = await GET(new Request('http://localhost/api/users/user-1/books'), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.books).toHaveLength(1);
      expect((body as any).data.books[0].id).toBe('book-1');
    });

    it('allows a user to view their own books', async () => {
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ books: [{ id: 'book-1', title: 'My Book' }] }])
      );

      const res = await GET(new Request('http://localhost/api/users/user-1/books'), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.books).toHaveLength(1);
    });

    it('returns empty array when user has no books', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ books: null }]));

      const res = await GET(new Request('http://localhost/api/users/user-1/books'), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.books).toEqual([]);
    });

    it('returns empty array when user not found', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const res = await GET(new Request('http://localhost/api/users/user-1/books'), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.books).toEqual([]);
    });

    it('handles non-array books field gracefully', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ books: 'not-an-array' }]));

      const res = await GET(new Request('http://localhost/api/users/user-1/books'), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.books).toEqual([]);
    });
  });

  describe('POST /api/users/[id]/books', () => {
    function postRequest(body: unknown): Request {
      return new Request('http://localhost/api/users/user-1/books', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    it('returns 401 without auth session', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const res = await POST(
        postRequest({ action: 'add', book: { id: 'b1', title: 'New Book' } }),
        {
          params: Promise.resolve({ id: 'user-1' }),
        }
      );

      expect(res.status).toBe(401);
    });

    it('returns 401 when non-admin posts to another user', async () => {
      mocks.getSessionAndRole.mockResolvedValue({ userId: 'user-2', role: 'RESIDENT' });

      const res = await POST(
        postRequest({ action: 'add', book: { id: 'b1', title: 'New Book' } }),
        {
          params: Promise.resolve({ id: 'user-1' }),
        }
      );

      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const res = await POST(
        postRequest({ action: 'add', book: { id: 'b1', title: 'New Book' } }),
        {
          params: Promise.resolve({ id: 'user-1' }),
        }
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect((body as any).error.code).toBe('NOT_FOUND');
    });

    it("adds a book to the user's list", async () => {
      const newBook = { id: 'b1', title: 'New Book', author: 'Author' };
      mocks.dbMock.select.mockReturnValueOnce(
        makeSelectChain([{ books: [{ id: 'b0', title: 'Old Book' }] }])
      );

      const res = await POST(postRequest({ action: 'add', book: newBook }), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.books).toHaveLength(2);
      expect((body as any).data.books[1]).toEqual(newBook);
    });

    it("deletes a book from the user's list by bookId", async () => {
      const existingBooks = [
        { id: 'b1', title: 'First Book' },
        { id: 'b2', title: 'Second Book' },
        { id: 'b3', title: 'Third Book' },
      ];
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ books: existingBooks }]));

      const res = await POST(postRequest({ action: 'delete', bookId: 'b2' }), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.books).toHaveLength(2);
      expect((body as any).data.books.map((b: any) => b.id)).not.toContain('b2');
    });

    it('does nothing when deleting a non-existent bookId', async () => {
      const existingBooks = [{ id: 'b1', title: 'Only Book' }];
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ books: existingBooks }]));

      const res = await POST(postRequest({ action: 'delete', bookId: 'nonexistent' }), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.books).toHaveLength(1);
    });

    it('handles add when user has null books', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ books: null }]));

      const res = await POST(postRequest({ action: 'add', book: { id: 'b1', title: 'New' } }), {
        params: Promise.resolve({ id: 'user-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.books).toHaveLength(1);
    });

    it('allows ADMIN to add books to another user', async () => {
      mocks.getSessionAndRole.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ books: [] }]));

      const res = await POST(
        postRequest({ action: 'add', book: { id: 'b1', title: 'Admin Added' } }),
        {
          params: Promise.resolve({ id: 'user-1' }),
        }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect((body as any).data.books).toHaveLength(1);
    });
  });
});
