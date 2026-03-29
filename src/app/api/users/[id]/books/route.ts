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
