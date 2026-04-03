import { db, users } from '@/lib/db';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const userResult = await db
    .select({ books: users.books })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!userResult[0]) {
    return NextResponse.json({ books: [] }, { status: 404 });
  }

  const books = Array.isArray(userResult[0].books) ? userResult[0].books : [];
  return NextResponse.json({ books });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { action, book, bookId } = body;

  const userResult = await db
    .select({ books: users.books })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!userResult[0]) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const books = Array.isArray(userResult[0].books) ? userResult[0].books : [];
  let updatedBooks = books;

  if (action === 'add' && book) {
    updatedBooks = [...books, book];
  } else if (action === 'delete' && bookId) {
    updatedBooks = books.filter(b => (b as { id: string }).id !== bookId);
  }

  await db.update(users).set({ books: updatedBooks }).where(eq(users.id, id));

  return NextResponse.json({ books: updatedBooks });
}
