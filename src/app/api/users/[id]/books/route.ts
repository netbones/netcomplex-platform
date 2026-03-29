import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { books: true },
  });

  if (!user) {
    return NextResponse.json({ books: [] }, { status: 404 });
  }

  const books = Array.isArray(user.books) ? user.books : [];
  return NextResponse.json({ books });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { action, book, bookId } = body;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { books: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const books = Array.isArray(user.books) ? user.books : [];
  let updatedBooks = books;

  if (action === 'add' && book) {
    updatedBooks = [...books, book];
  } else if (action === 'delete' && bookId) {
    updatedBooks = books.filter(b => (b as { id: string }).id !== bookId);
  }

  await prisma.user.update({
    where: { id },
    data: { books: updatedBooks },
  });

  return NextResponse.json({ books: updatedBooks });
}
