import { db, users, apiSuccess, apiNotFound, apiError, withErrorHandler } from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();

    const userResult = await db
      .select({ books: users.books })
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!userResult[0]) {
      return apiSuccess({ books: [] });
    }

    const books = Array.isArray(userResult[0].books) ? userResult[0].books : [];
    return apiSuccess({ books });
  }
);

export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();
    const body = await request.json();
    const { action, book, bookId } = body;

    const userResult = await db
      .select({ books: users.books })
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!userResult[0]) {
      return apiNotFound('User not found');
    }

    const books = Array.isArray(userResult[0].books) ? userResult[0].books : [];
    let updatedBooks = books;

    if (action === 'add' && book) {
      updatedBooks = [...books, book];
    } else if (action === 'delete' && bookId) {
      updatedBooks = books.filter(b => (b as { id: string }).id !== bookId);
    }

    await db
      .update(users)
      .set({ books: updatedBooks })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));

    return apiSuccess({ books: updatedBooks });
  }
);
